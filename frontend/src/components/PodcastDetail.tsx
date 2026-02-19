import Script from 'next/script';

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

import {Markdown} from '@/src/lib/markdown/Markdown';
import {YoutubeSection} from '@/src/components/YoutubeSection';
import {generatePodcastJsonLd} from '@/src/lib/jsonld/podcast';
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
 * Render a podcast episode detail view including image, metadata, audio player, shownotes, and an optional YouTube section.
 *
 * If `podcast` is nullish, returns `null`. Embeds episode JSON-LD for SEO and resolves an optimized image and audio URL with sensible fallbacks.
 *
 * @returns A React element that renders the episode detail, or `null` if the `podcast` prop is nullish.
 */
export function PodcastDetail({slug, podcast: initialPodcast}: PodcastDetailProps) {
    const podcast = initialPodcast;
    if (!podcast) return null;

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
    const imageAlt = optimizedMedia?.alternativeText ?? podcast.base.title;
    const imageTitle = optimizedMedia?.caption ?? undefined;
    const jsonLd = generatePodcastJsonLd(podcast);

    return (
        <article className={styles.episode}>
            <Script
                id={`jsonld-podcast-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLd).replace(REGEX_LT_ESCAPE, '\\u003c'),
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
                <h1 className={styles.title}>{podcast.base.title}</h1>
                {podcast.base.description ? (
                    <p className={styles.description}>{podcast.base.description}</p>
                ) : null}
            </section>

            {audioUrl ? <PodcastPlayer src={audioUrl} /> : null}

            <Markdown markdown={podcast.shownotes ?? ''} />

            {podcast.youtube && podcast.youtube.length > 0 && <YoutubeSection youtube={podcast.youtube} />}
        </article>
    );
}
