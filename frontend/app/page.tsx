import Link from 'next/link';
import {Suspense} from 'react';
import {type Metadata} from 'next';

import {Tag} from '@/src/components/Tag';
import {Card} from '@/src/components/Card';
import {Pagination} from '@/src/components/Pagination';
import {FeedSkeleton} from '@/src/components/FeedSkeleton';
import {getEffectiveDate, sortByDateDesc, toDateTimestamp} from '@/src/lib/effectiveDate';
import {fetchArticlesPage, fetchPodcastsPage} from '@/src/lib/strapiContent';
import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';
import {mediaUrlToAbsolute, pickBannerMedia, pickCoverMedia, type StrapiMedia} from '@/src/lib/rss/media';
import {absoluteRoute} from '@/src/lib/routes';
import {formatDateShort} from '@/src/lib/dateFormatters';
import {calculateReadingTime} from '@/src/lib/readingTime';
import styles from './page.module.css';
import Image from 'next/image';
import placeholderCover from '@/public/images/m10z.jpg';

export const metadata: Metadata = {
    description: 'Ein offener Kanal für Videospielcontent und das Drumherum – unentgeltlich, unabhängig, ungezwungen. Artikel, Podcasts und mehr zu Gaming, Organisationskultur und HR-Themen.',
    openGraph: {
        images: [
            {
                url: absoluteRoute('/images/m10z.jpg'),
                alt: 'Mindestens 10 Zeichen',
            },
        ],
    },
    alternates: {
        canonical: absoluteRoute('/'),
    },
};

const HOME_ARTICLE_TAGS = ['page:home', 'strapi:article'];
const HOME_PODCAST_TAGS = ['page:home', 'strapi:podcast'];
const PAGE_SIZE = 10;
const MAX_PAGE = 50;
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL;

type FeedItem =
    | {
    type: 'article';
    slug: string;
    title: string;
    description?: string | null;
    publishedAt?: string | null;
    cover?: StrapiMedia | undefined;
    banner?: StrapiMedia | undefined;
    wordCount?: number | null;
    href: string;
}
    | {
    type: 'podcast';
    slug: string;
    title: string;
    description?: string | null;
    publishedAt?: string | null;
    cover?: StrapiMedia | undefined;
    banner?: StrapiMedia | undefined;
    wordCount?: number | null;
    href: string;
};

if (!STRAPI_URL) {
    throw new Error('Missing NEXT_PUBLIC_STRAPI_URL');
}

function parsePageParam(searchParams?: Record<string, string | string[] | undefined>): number {
    const raw = searchParams?.page;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.min(Math.floor(parsed), MAX_PAGE);
}

/**
 * Convert a Strapi media object into an absolute URL.
 *
 * @param media - The Strapi media object to convert; may be undefined
 * @returns The absolute URL for the media, or `undefined` if the media is missing or cannot be resolved
 */
function toCoverUrl(media?: StrapiMedia): string | undefined {
    return mediaUrlToAbsolute({media});
}

/**
 * Convert an array of StrapiArticle records into feed items suitable for rendering on the home feed.
 *
 * @param items - Array of articles from Strapi
 * @returns An array of `FeedItem` objects with `type: 'article'`, `slug`, `title`, `description`, `publishedAt`, `cover`, and `href` set for each article
 */
function mapArticlesToFeed(items: StrapiArticle[]): FeedItem[] {
    return items.map((article) => ({
        type: 'article',
        slug: article.slug,
        title: article.base.title,
        description: article.base.description,
        publishedAt: getEffectiveDate(article),
        cover: pickCoverMedia(article.base, article.categories),
        banner: pickBannerMedia(article.base, article.categories),
        wordCount: article.wordCount ?? null,
        href: `/artikel/${article.slug}`,
    }));
}

function mapPodcastsToFeed(items: StrapiPodcast[]): FeedItem[] {
    return items.map((podcast) => ({
        type: 'podcast',
        slug: podcast.slug,
        title: podcast.base.title,
        description: podcast.base.description,
        publishedAt: getEffectiveDate(podcast),
        cover: pickCoverMedia(podcast.base, podcast.categories),
        banner: pickBannerMedia(podcast.base, podcast.categories),
        wordCount: podcast.wordCount ?? null,
        href: `/podcasts/${podcast.slug}`,
    }));
}


function clampPageToData(page: number, totalItems: number): number {
    if (totalItems <= 0) return 1;
    const maxPage = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    return Math.min(page, maxPage);
}

function hasNextPage(currentPage: number, totalItems: number): boolean {
    return currentPage * PAGE_SIZE < totalItems;
}

type SearchParams =
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>
    | undefined;

export default function HomePage(props: {searchParams?: SearchParams}) {
    return (
        <div>
            <Suspense fallback={<FeedSkeleton />}>
                <FeedContent searchParams={props.searchParams} />
            </Suspense>
        </div>
    );
}

async function FeedContent({searchParams}: {searchParams?: SearchParams}) {
    const resolvedSearchParams = await searchParams;
    const requestedPage = parsePageParam(resolvedSearchParams);
    const fetchCount = Math.min(PAGE_SIZE * requestedPage + PAGE_SIZE, 200);

    const [articlesPage, podcastsPage] = await Promise.all([
        fetchArticlesPage({page: 1, pageSize: fetchCount, tags: HOME_ARTICLE_TAGS}),
        fetchPodcastsPage({page: 1, pageSize: fetchCount, tags: HOME_PODCAST_TAGS}),
    ]);

    const combinedTotal = articlesPage.pagination.total + podcastsPage.pagination.total;
    const currentPage = clampPageToData(requestedPage, combinedTotal);
    const offset = (currentPage - 1) * PAGE_SIZE;

    // Sort articles and podcasts by effective date (base.date prioritized over publishedAt)
    const sortedArticles = sortByDateDesc(articlesPage.items);
    const sortedPodcasts = sortByDateDesc(podcastsPage.items);

    // Combine and sort the mapped feed items by their effective date
    // Both publishedAt fields already contain the effective date from getEffectiveDate
    const feedItems = [
        ...mapArticlesToFeed(sortedArticles),
        ...mapPodcastsToFeed(sortedPodcasts),
    ].sort((a, b) => {
        const ad = toDateTimestamp(a.publishedAt) ?? 0;
        const bd = toDateTimestamp(b.publishedAt) ?? 0;
        return bd - ad;
    });

    const currentItems = feedItems.slice(offset, offset + PAGE_SIZE);
    const nextPage = hasNextPage(currentPage, combinedTotal) ? currentPage + 1 : null;
    const prevPage = currentPage > 1 ? currentPage - 1 : null;

    return (
        <div className={styles.page}>
            <aside className={styles.toc} aria-label="Inhaltsverzeichnis">
                <h2 className={styles.tocTitle}>Inhaltsverzeichnis</h2>
                {currentItems.length === 0 ? (
                    <p className={styles.empty}>Gerade nichts Neues.</p>
                ) : (
                    <ul className={styles.tocList}>
                        {currentItems.map((item) => {
                            const anchor = `${item.type}-${item.slug}`;
                            return (
                                <li key={anchor} className={styles.tocEntry}>
                                    <a href={`#${anchor}`} className={styles.tocLink}>
                                        <div className={styles.tocMetadata}>
                                            <Tag className={styles.tocTag}>
                                                {item.type === 'article' ? 'Artikel' : 'Podcast'}
                                            </Tag>
                                            {item.publishedAt ? (
                                                <time className={styles.tocDate} dateTime={item.publishedAt}>
                                                    {formatDateShort(item.publishedAt)}
                                                </time>
                                            ) : (
                                                <span className={styles.tocDate}>{formatDateShort(item.publishedAt)}</span>
                                            )}
                                        </div>
                                        <h3 className={styles.tocLabel}>{item.title}</h3>
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </aside>

            <section className={styles.feed} aria-label="Neueste Inhalte">
                {currentItems.length === 0 ? (
                    <Card variant="empty">Keine Inhalte gefunden.</Card>
                ) : (
                    currentItems.map((item) => {
                        const anchor = `${item.type}-${item.slug}`;
                        const coverUrl = toCoverUrl(item.cover);
                        const bannerUrl = toCoverUrl(item.banner);

                        // Get blur data URLs from cover and banner
                        const coverBlurDataUrl = item.cover?.blurhash ?? null;
                        const bannerBlurDataUrl = item.banner?.blurhash ?? null;

                        // Determine placeholders - use blur if we have data URL, otherwise empty
                        const coverPlaceholder = coverBlurDataUrl ? 'blur' : (coverUrl ? 'empty' : 'blur');
                        const bannerPlaceholder = bannerBlurDataUrl ? 'blur' : (bannerUrl || coverUrl ? 'empty' : 'blur');

                        return (
                            <Card key={anchor} id={anchor}>
                                <div className={styles.media}>
                                    <Image
                                        src={coverUrl ?? placeholderCover}
                                        width={200}
                                        height={200}
                                        placeholder={coverPlaceholder}
                                        blurDataURL={coverBlurDataUrl || undefined}
                                        alt={item.title || ''}
                                        className={styles.cover}
                                    />
                                    <Image
                                        src={bannerUrl ?? coverUrl ?? placeholderCover}
                                        width={800}
                                        height={450}
                                        placeholder={bannerPlaceholder}
                                        blurDataURL={bannerBlurDataUrl || coverBlurDataUrl || undefined}
                                        alt={item.title || ''}
                                        className={styles.banner}
                                    />
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.metaRow}>
                                        <Tag className={styles.metaTag}>
                                            {item.type === 'article' ? 'Artikel' : 'Podcast'}
                                        </Tag>
                                        {item.wordCount != null ? (
                                            <span className={styles.readingTime}>
                                                📖&nbsp;{calculateReadingTime(item.wordCount)}
                                            </span>
                                        ) : null}
                                        <time className={styles.date}>{formatDateShort(item.publishedAt)}</time>
                                    </div>
                                    <h2 className={styles.cardTitle}>
                                        <Link href={item.href} className={styles.cardLink}>
                                            {item.title}
                                        </Link>
                                    </h2>
                                    {item.description ? (
                                        <p className={styles.description}>{item.description}</p>
                                    ) : null}
                                    <div className={styles.cardActions}>
                                        <Link href={item.href} className={styles.readMore}>
                                            Weiterlesen
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        );
                    })
                )}

                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(combinedTotal / PAGE_SIZE)}
                    previousHref={prevPage ? `/?page=${prevPage}` : undefined}
                    nextHref={nextPage ? `/?page=${nextPage}` : undefined}
                />
            </section>
        </div>
    );
}
