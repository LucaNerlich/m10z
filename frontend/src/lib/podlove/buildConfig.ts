import {type StrapiPodcast} from '@/src/lib/strapi/contentTypes';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {formatIso8601Date} from '@/src/lib/jsonld/helpers';
import {absoluteRoute} from '@/src/lib/routes';

import {
    type PodloveAudioAsset,
    type PodloveEpisodeConfig,
    type PodloveFileAsset,
    type PodlovePlayerConfig,
} from './types';

// Absolute URL of the M10Z audio RSS feed, used by the player's subscribe button.
const AUDIO_FEED_PATH = '/audiofeed.xml';

/**
 * Format a duration given in whole seconds into Podlove's `[hh]:[mm]:[ss].[sss]` string.
 *
 * Podcast durations are stored as integer seconds by the backend duration middleware, so the
 * milliseconds component is always `000`. Non-finite or non-positive input yields `00:00:00.000`.
 */
export function formatPodloveDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return '00:00:00.000';
    }
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.000`;
}

function toByteSizeString(sizeBytes: number | undefined): string | undefined {
    if (typeof sizeBytes !== 'number' || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
        return undefined;
    }
    return String(Math.floor(sizeBytes));
}

export type PodloveEpisodeInput = {
    /** Playable audio URL (may be the download-tracking endpoint when tracking is enabled). */
    audioUrl: string;
    audioMime?: string | null;
    audioSizeBytes?: number;
    /** Absolute poster/cover image URL. */
    posterUrl?: string;
    /** Absolute canonical episode URL. */
    link?: string;
};

/**
 * Build the Podlove episode object from a Strapi podcast record and pre-resolved media values.
 *
 * The caller resolves the audio URL (direct file vs. tracking endpoint), MIME type, byte size,
 * poster, and canonical link so this function stays pure and unit-testable.
 */
export function buildPodloveEpisodeConfig(
    podcast: StrapiPodcast,
    input: PodloveEpisodeInput,
): PodloveEpisodeConfig {
    const {audioUrl, audioMime, audioSizeBytes, posterUrl, link} = input;
    const mimeType = audioMime?.trim() || 'audio/mpeg';
    const size = toByteSizeString(audioSizeBytes);
    const summary = podcast.description?.trim() || undefined;
    const publicationDate = formatIso8601Date(getEffectiveDate(podcast));

    const audioAsset: PodloveAudioAsset = {
        url: audioUrl,
        mimeType,
        title: 'Audio',
        ...(size ? {size} : {}),
    };

    const fileAsset: PodloveFileAsset = {
        url: audioUrl,
        mimeType,
        title: 'Download',
        ...(size ? {size} : {}),
    };

    return {
        version: 5,
        title: podcast.title,
        ...(summary ? {summary} : {}),
        ...(publicationDate ? {publicationDate} : {}),
        duration: formatPodloveDuration(podcast.duration),
        ...(posterUrl ? {poster: posterUrl} : {}),
        ...(link ? {link} : {}),
        audio: [audioAsset],
        files: [fileAsset],
    };
}

/**
 * Build the static Podlove player configuration.
 *
 * Loaded from the CDN, so no `base` is set (the CDN build self-resolves its chunks). The theme uses
 * a single static brand color derived from the site's base `--color-primary` OKLCH token. The
 * Podlove player only accepts static hex/rgba tokens at init, so this does not react to the site's
 * runtime theme switches (documented limitation). Files and Share (mail/link) tabs are enabled, and
 * a subscribe button links to the M10Z audio feed plus common podcast clients.
 */
export function buildPodlovePlayerConfig(): PodlovePlayerConfig {
    const feedUrl = absoluteRoute(AUDIO_FEED_PATH);
    return {
        version: 5,
        // Force German UI labels (the site is German); otherwise the player follows the browser
        // locale. The player reads the locale from `runtime`, so set it there (top-level `language`
        // is kept as a hint for completeness).
        language: 'de',
        runtime: {language: 'de', locale: 'de-DE'},
        activeTab: 'files',
        theme: {
            tokens: {
                brand: '#ef702c',
                brandDark: '#dd5400',
                brandDarkest: '#8a2400',
                brandLightest: '#ffdcc7',
                shadeDark: '#807e7c',
                shadeBase: '#807e7c',
                contrast: '#000',
                alt: '#fff',
            },
        },
        share: {
            channels: ['mail', 'link'],
            sharePlaytime: true,
        },
        'subscribe-button': {
            feed: feedUrl,
            // Only the plain RSS link for now (no app deep-links).
            clients: [{id: 'rss', service: feedUrl}],
        },
    };
}
