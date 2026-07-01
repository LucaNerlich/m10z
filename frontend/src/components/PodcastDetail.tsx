import Script from 'next/script';

import {type StrapiPodcast} from '@/src/lib/strapi/contentTypes';
import {buildPodcastDownloadPath} from '@/src/lib/analytics/podcastDownload';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {
    getOptimalMediaFormat,
    mediaUrlToAbsolute,
    normalizeStrapiMedia,
    pickBannerOrCoverMedia,
} from '@/src/lib/strapi/media';
import {normalizeEnclosureLengthBytes} from '@/src/lib/rss/audiofeed';
import {buildPodloveEpisodeConfig, buildPodlovePlayerConfig} from '@/src/lib/podlove/buildConfig';
import {absoluteRoute, routes} from '@/src/lib/routes';
import {ContentMetadata} from '@/src/components/ContentMetadata';
import {ContentImage} from '@/src/components/ContentImage';
import {Markdown} from '@/src/lib/markdown/Markdown';
import {YoutubeSection} from '@/src/components/YoutubeSection';
import {generatePodcastJsonLd} from '@/src/lib/jsonld/podcast';
import {generateBreadcrumbJsonLd} from '@/src/lib/jsonld/breadcrumb';
import {PodcastPlayer} from '@/app/podcasts/[slug]/Player';
import placeholderCover from '@/public/images/m10z.jpg';
import styles from '@/app/podcasts/[slug]/page.module.css';

// Hoist RegExp pattern to module scope
const REGEX_LT_ESCAPE = /</g;

type PodcastDetailProps = {
    slug: string;
    podcast: StrapiPodcast | null;
};

/**
 * Renders the detail view for a podcast episode.
 *
 * Displays the episode image, metadata, title, Podlove player, shownotes, and an optional YouTube section. Also embeds podcast and breadcrumb JSON-LD for search engines.
 *
 * @returns The podcast detail view, or `null` when no podcast is available.
 */
export function PodcastDetail({slug, podcast: initialPodcast}: PodcastDetailProps) {
    const podcast = initialPodcast;
    if (!podcast) return null;

    const published = getEffectiveDate(podcast);
    const fileMedia = normalizeStrapiMedia(podcast.file);
    const audioUrl = mediaUrlToAbsolute({media: fileMedia});
    // Always route on-site playback and downloads through the download-tracking endpoint so plays
    // are recorded; it 302-redirects to the real Strapi file. The Podlove player requests this URL
    // when the listener presses play (and for the Files-tab download), which is what records the
    // event. `undefined` when the episode has no audio file, in which case no player is rendered.
    const playerSrc = audioUrl ? buildPodcastDownloadPath(slug) : undefined;
    const bannerOrCoverMedia = pickBannerOrCoverMedia(podcast, podcast.categories);
    const optimizedMedia = bannerOrCoverMedia ? getOptimalMediaFormat(bannerOrCoverMedia, 'large') : undefined;

    // Fallback configuration
    const fallbackSrc = placeholderCover;
    const fallbackWidth = 400;
    const fallbackHeight = 225;

    // Determine final values
    const mediaUrl = optimizedMedia ? mediaUrlToAbsolute({media: optimizedMedia}) : undefined;
    const imageSrc = mediaUrl ?? fallbackSrc;
    const imageWidth = optimizedMedia?.width ?? fallbackWidth;
    const imageHeight = optimizedMedia?.height ?? fallbackHeight;
    const blurhash = optimizedMedia?.blurhash ?? null;
    const placeholder = blurhash ? 'blur' : 'empty';
    const imageAlt = optimizedMedia?.alternativeText ?? podcast.title;
    const imageTitle = optimizedMedia?.caption ?? undefined;

    // Podlove Web Player: build the episode + player config. `playerSrc` becomes the audio URL, so
    // download tracking (when enabled) works exactly as it does for the RSS enclosure.
    const podloveEpisode = playerSrc
        ? buildPodloveEpisodeConfig(podcast, {
            audioUrl: playerSrc,
            audioMime: fileMedia.mime,
            audioSizeBytes: normalizeEnclosureLengthBytes(fileMedia),
            posterUrl: mediaUrl,
            link: absoluteRoute(routes.podcast(slug)),
        })
        : null;
    const podlovePlayerConfig = buildPodlovePlayerConfig();

    const jsonLd = generatePodcastJsonLd(podcast);
    const breadcrumbItems = [
        {name: 'Startseite', path: '/'},
        {name: 'Podcasts', path: '/podcasts'},
        {name: podcast.title, path: `/podcasts/${slug}`},
    ];
    const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbItems);

    return (
        <article className={styles.episode}>
            <Script
                id={`jsonld-podcast-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLd).replace(REGEX_LT_ESCAPE, '\\u003c'),
                }}
            />
            <Script
                id={`jsonld-breadcrumb-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(breadcrumbJsonLd).replace(REGEX_LT_ESCAPE, '\\u003c'),
                }}
            />

            <ContentImage
                src={imageSrc}
                alt={imageAlt}
                title={imageTitle}
                width={imageWidth}
                height={imageHeight}
                placeholder={placeholder}
                blurhash={blurhash}
                priority={true}
            />
            <section className={styles.header}>
                <ContentMetadata
                    publishedDate={published}
                    duration={podcast.duration}
                    authors={podcast.authors}
                    categories={podcast.categories}
                />
                <h1 className={styles.title}>{podcast.title}</h1>
            </section>

            {podloveEpisode ? (
                <PodcastPlayer episode={podloveEpisode} config={podlovePlayerConfig} />
            ) : null}

            <Markdown markdown={podcast.shownotes ?? ''} />

            {podcast.youtube && podcast.youtube.length > 0 && <YoutubeSection youtube={podcast.youtube} />}
        </article>
    );
}
