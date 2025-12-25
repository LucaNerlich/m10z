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
import {formatDateShort} from '@/src/lib/dateFormatters';
import {AuthorList} from '@/src/components/AuthorList';
import {CategoryList} from '@/src/components/CategoryList';
import styles from './page.module.css';

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    'use cache';
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
 * Render the podcast episode detail page for the route slug.
 *
 * Fetches the episode by slug, prepares published date, media URL, and JSON-LD, and returns the page JSX.
 *
 * Triggers a 404 response (via `notFound`) if the slug is invalid or no episode is found.
 *
 * @param params - A promise resolving to an object with a `slug` string from the route parameters
 * @returns A React element containing an `application/ld+json` script with episode JSON-LD, the episode metadata (title, date, description), an optional audio player when media is available, and rendered shownotes
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
    const optimizedMedia = bannerOrCoverMedia ? getOptimalMediaFormat(bannerOrCoverMedia, 'medium') : undefined;
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
                        {published ? (
                            <time dateTime={published} className={styles.publishedDate}>
                                {formatDateShort(published)}
                            </time>
                        ) : null}
                        <h1 className={styles.title}>{episode.base.title}</h1>
                        {episode.base.description ? (
                            <p className={styles.description}>
                                {episode.base.description}
                            </p>
                        ) : null}
                        <div className={styles.metaRow}>
                            {episode.authors && episode.authors.length > 0 ? (
                                <div>
                                    <span className={styles.metaLabel}>Von:</span>
                                    <AuthorList authors={episode.authors} showAvatars={true} layout="inline" />
                                </div>
                            ) : null}
                            {episode.categories && episode.categories.length > 0 ? (
                                <CategoryList categories={episode.categories} />
                            ) : null}
                        </div>
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
