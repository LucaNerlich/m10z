'use cache';

import {type Metadata} from 'next';
import {notFound} from 'next/navigation';
import Image from 'next/image';

import {Markdown} from '@/src/lib/markdown/Markdown';
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
import {generatePodcastJsonLd} from '@/src/lib/jsonld/podcast';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {ContentMetadata} from '@/src/components/ContentMetadata';
import styles from './page.module.css';

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
 * Renders the podcast episode detail page for the given route slug.
 *
 * Fetches the episode by slug, prepares metadata (published date, media URLs, JSON-LD, cover image), and renders the episode content.
 *
 * @param params - Route parameters object (contains a `slug` string)
 * @returns A React element that includes an `application/ld+json` script with episode JSON-LD, the episode header (title, metadata, optional description and cover image), an optional audio player when media is available, and the rendered shownotes
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
    const jsonLd = generatePodcastJsonLd(episode);
    const bannerOrCoverMedia = pickBannerOrCoverMedia(episode.base, episode.categories);
    const optimizedMedia = bannerOrCoverMedia ? getOptimalMediaFormat(bannerOrCoverMedia, 'large') : undefined;
    const coverImageUrl = optimizedMedia ? mediaUrlToAbsolute({media: optimizedMedia}) : undefined;
    const coverWidth = optimizedMedia?.width;
    const coverHeight = optimizedMedia?.height;

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
            />
            <main>
                <article className={styles.episode}>
                    {coverImageUrl && coverWidth && coverHeight ? (
                        <div className={styles.coverImageContainer}>
                            <Image
                                src={coverImageUrl}
                                alt={episode.base.title}
                                width={coverWidth}
                                height={coverHeight}
                                priority
                                className={styles.coverImage}
                            />
                        </div>
                    ) : null}
                    <header className={styles.header}>
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
                    </header>

                    {audioUrl ? (
                        <div className={styles.player}>
                            <PodcastPlayer src={audioUrl} />
                        </div>
                    ) : null}

                    <div className={styles.content}>
                        <Markdown markdown={episode.shownotes ?? ''} />
                    </div>
                </article>
            </main>
        </>
    );
}