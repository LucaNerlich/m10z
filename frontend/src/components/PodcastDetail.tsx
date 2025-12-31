'use client';

import {usePodcast} from '@/src/hooks/useStrapiContent';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {
    getOptimalMediaFormat,
    mediaUrlToAbsolute,
    normalizeStrapiMedia,
    pickBannerOrCoverMedia,
} from '@/src/lib/rss/media';
import {ContentMetadata} from '@/src/components/ContentMetadata';
import {ContentImage} from '@/src/components/ContentImage';
import {Section} from '@/src/components/Section';
import {MarkdownClient} from '@/src/components/MarkdownClient';
import {YoutubeSection} from '@/src/components/YoutubeSection';
import {LoadingPlaceholder} from '@/src/components/LoadingPlaceholder';
import {ErrorCardWithRetry} from '@/src/components/ErrorCardWithRetry';
import {generatePodcastJsonLd} from '@/src/lib/jsonld/podcast';
import {PodcastPlayer} from '@/app/podcasts/[slug]/Player';
import placeholderCover from '@/public/images/m10z.jpg';
import styles from '@/app/podcasts/[slug]/page.module.css';

type PodcastDetailProps = {
    slug: string;
    podcast: StrapiPodcast | null;
};

/**
 * Renders a podcast episode detail view including image, metadata, audio player, shownotes, and an optional YouTube section.
 *
 * Embeds episode JSON-LD for SEO and displays appropriate loading or error UI when data is unavailable.
 *
 * @returns A React element that renders the podcast detail view.
 */
export function PodcastDetail({slug, podcast: initialPodcast}: PodcastDetailProps) {
    const {data: podcast, error, isLoading} = usePodcast(slug, initialPodcast);

    // Show loading state only if we don't have initial data
    if (isLoading && !podcast) {
        return (
            <article className={styles.episode}>
                <LoadingPlaceholder
                    isLoading={isLoading}
                    hasData={!!podcast}
                    message="Lade Podcast..."
                />
            </article>
        );
    }

    // Handle errors
    if (error || !podcast) {
        return (
            <article className={styles.episode}>
                <ErrorCardWithRetry message="Fehler beim Laden des Podcasts." />
            </article>
        );
    }

    const published = getEffectiveDate(podcast);
    const fileMedia = normalizeStrapiMedia(podcast.file);
    const audioUrl = mediaUrlToAbsolute({media: fileMedia});
    const bannerOrCoverMedia = pickBannerOrCoverMedia(podcast.base, podcast.categories);
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
    const jsonLd = generatePodcastJsonLd(podcast);

    return (
        <article className={styles.episode}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
                }}
            />

            <ContentImage
                src={imageSrc}
                alt={podcast.base.title}
                width={imageWidth}
                height={imageHeight}
                placeholder={placeholder}
                blurhash={blurhash}
            />
            <Section className={styles.header}>
                <ContentMetadata
                    publishedDate={published}
                    duration={podcast.duration}
                    authors={podcast.authors}
                    categories={podcast.categories}
                />
                <h1 className={styles.title}>{podcast.base.title}</h1>
                {podcast.base.description ? (
                    <p className={styles.description}>{podcast.base.description}</p>
                ) : null}
            </Section>

            {audioUrl ? <PodcastPlayer src={audioUrl} /> : null}

            <MarkdownClient markdown={podcast.shownotes ?? ''} />

            {podcast.youtube && podcast.youtube.length > 0 && <YoutubeSection youtube={podcast.youtube} />}
        </article>
    );
}
