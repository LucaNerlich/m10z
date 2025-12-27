'use cache';

import {type Metadata} from 'next';
import {notFound} from 'next/navigation';

import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {
    getOptimalMediaFormat,
    mediaUrlToAbsolute,
    normalizeStrapiMedia,
    pickBannerOrCoverMedia,
} from '@/src/lib/rss/media';
import {fetchPodcastBySlug} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {PodcastPlayer} from './Player';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {ContentMetadata} from '@/src/components/ContentMetadata';
import {ContentImage} from '@/src/components/ContentImage';
import {Section} from '@/src/components/Section';
import {ContentLayout} from '@/app/ContentLayout';
import placeholderCover from '@/public/images/m10z.jpg';
import styles from './page.module.css';
import {MarkdownClient} from '@/src/components/MarkdownClient';
import {YoutubeSection} from '@/src/components/YoutubeSection';
import {generatePodcastJsonLd} from '@/src/lib/jsonld/podcast';

type PageProps = {
    params: Promise<{slug: string}>;
};

/**
 * Builds Next.js page metadata for a podcast episode identified by the route slug.
 *
 * Fetches the episode by slug and, if found, produces metadata including title,
 * description, canonical URL, OpenGraph (article) data, and Twitter card images
 * based on the episode's banner or cover media.
 *
 * @param params - Route params (resolves to an object with a `slug` string)
 * @returns A Metadata object containing title, description, alternates (canonical URL),
 *          `openGraph` (type, title, description, images) and `twitter` card fields;
 *          returns an empty Metadata object if the slug is invalid or no episode is found.
 */
export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    const episode = await fetchPodcastBySlug(slug);
    if (!episode) return {};

    const title = episode.base.title;
    const description = episode.base.description || undefined;
    const bannerOrCoverMedia = pickBannerOrCoverMedia(episode.base, episode.categories);
    const coverImage = bannerOrCoverMedia ? formatOpenGraphImage(bannerOrCoverMedia) : undefined;

    const openGraph: Metadata['openGraph'] = {
        type: 'article',
        title,
        description,
        images: coverImage,
    };

    return {
        title,
        description,
        alternates: {
            canonical: absoluteRoute(`/podcasts/${slug}`),
        },
        openGraph,
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: coverImage,
        },
    };
}

/**
 * Render the podcast episode detail page for a route slug.
 *
 * Builds page content and metadata for the episode identified by `params.slug`, injects episode JSON-LD,
 * displays the cover image, episode metadata (published date, duration, authors, categories), title and optional description,
 * includes an audio player when episode media exists, renders shownotes as Markdown, and conditionally renders a YouTube section.
 *
 * @param params - Route parameters object containing a `slug` string
 * @returns A React element representing the podcast episode detail page
 */
export default async function PodcastDetailPage({params}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return notFound();

    const episode = await fetchPodcastBySlug(slug);
    if (!episode) return notFound();

    const published = getEffectiveDate(episode);
    const fileMedia = normalizeStrapiMedia(episode.file);
    const audioUrl = mediaUrlToAbsolute({media: fileMedia});
    const bannerOrCoverMedia = pickBannerOrCoverMedia(episode.base, episode.categories);
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
    const placeholder = blurhash ? 'blur' : 'empty'; // Use blur placeholder only when blurhash is available
    const jsonLd = generatePodcastJsonLd(episode);

    return (
        <article className={styles.episode}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
                }}
            />

            <ContentLayout>
                <ContentImage
                    src={imageSrc}
                    alt={episode.base.title}
                    width={imageWidth}
                    height={imageHeight}
                    placeholder={placeholder}
                    blurhash={blurhash}
                />
                <Section className={styles.header}>
                    <ContentMetadata
                        publishedDate={published}
                        duration={episode.duration}
                        authors={episode.authors}
                        categories={episode.categories}
                    />
                    <h1 className={styles.title}>{episode.base.title}</h1>
                    {episode.base.description ? (
                        <p className={styles.description}>
                            {episode.base.description}
                        </p>
                    ) : null}
                </Section>

                {audioUrl ? <PodcastPlayer src={audioUrl} /> : null}

                <MarkdownClient markdown={episode.shownotes ?? ''} />

                {episode.youtube && episode.youtube.length > 0 && (
                    <YoutubeSection youtube={episode.youtube} />
                )}
            </ContentLayout>
        </article>
    );
}