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
 * Formats a duration in whole seconds for Podlove.
 *
 * @param seconds - The duration in seconds
 * @returns The duration as a Podlove time string, or `00:00:00.000` for invalid or non-positive input
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

/**
 * Converts a byte count to a whole-number string.
 *
 * @param sizeBytes - The byte count to format
 * @returns The floored byte count as a string, or `undefined` when the input is missing, non-finite, or less than or equal to zero
 */
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
 * Builds a Podlove episode configuration from a Strapi podcast record and pre-resolved media values.
 *
 * @param podcast - The podcast record used for the episode title, description, duration, and publication date
 * @param input - The resolved audio and optional metadata for the episode
 * @returns The Podlove episode configuration
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
        // German label shown as the download entry title in the player's Files tab.
        title: 'Herunterladen',
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
 * Builds the Podlove player configuration for the site.
 *
 * @returns The static Podlove player configuration with German UI settings, theme tokens, enabled share options, and a subscribe button for the audio feed.
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
        // No default active tab: start with just the playback controls (tabs open on click).
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
