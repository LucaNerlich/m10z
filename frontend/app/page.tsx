import Link from 'next/link';
import {Suspense} from 'react';

import {Tag} from '@/src/components/Tag';
import {getEffectiveDate, toDateTimestamp} from '@/src/lib/effectiveDate';
import {fetchArticlesPage, fetchPodcastsPage} from '@/src/lib/strapiContent';
import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';
import {mediaUrlToAbsolute, pickCoverMedia, type StrapiMedia} from '@/src/lib/rss/media';
import styles from './page.module.css';
import Image from 'next/image';
import placeholderCover from '@/public/images/m10z.jpg';

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
    href: string;
}
    | {
    type: 'podcast';
    slug: string;
    title: string;
    description?: string | null;
    publishedAt?: string | null;
    cover?: StrapiMedia | undefined;
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

function formatDate(raw?: string | null): string {
    if (!raw) return '—';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('de-DE', {year: 'numeric', month: 'short', day: 'numeric'});
}

function toCoverUrl(media?: StrapiMedia): string | undefined {
    return mediaUrlToAbsolute({media});
}

function mapArticlesToFeed(items: StrapiArticle[]): FeedItem[] {
    return items.map((article) => ({
        type: 'article',
        slug: article.slug,
        title: article.base.title,
        description: article.base.description,
        publishedAt: getEffectiveDate(article),
        cover: pickCoverMedia(article.base, article.categories),
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
        href: `/podcasts/${podcast.slug}`,
    }));
}

function sortFeedByDateDesc(items: FeedItem[]): FeedItem[] {
    return [...items].sort((a, b) => {
        const ad = toDateTimestamp(a.publishedAt) ?? 0;
        const bd = toDateTimestamp(b.publishedAt) ?? 0;
        return bd - ad;
    });
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
            <header className={styles.header}>
                <h1 className={styles.title}>Mindestens 10 Zeichen</h1>
                <p className={styles.subtitle}>Ein offener Kanal für Videospielcontent und das Drumherum –
                    unentgeltlich, unabhängig, ungezwungen.</p>
            </header>
            <Suspense fallback={<div className={styles.emptyCard}>Lade Inhalte…</div>}>
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

    const feedItems = sortFeedByDateDesc([
        ...mapArticlesToFeed(articlesPage.items),
        ...mapPodcastsToFeed(podcastsPage.items),
    ]);

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
                                        <h3 className={styles.tocLabel}>{item.title}</h3>
                                        <span className={styles.tocDate}>{formatDate(item.publishedAt)}</span>
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </aside>

            <section className={styles.feed} aria-label="Neueste Inhalte">
                {currentItems.length === 0 ? (
                    <div className={styles.emptyCard}>Keine Inhalte gefunden.</div>
                ) : (
                    currentItems.map((item) => {
                        const anchor = `${item.type}-${item.slug}`;
                        const coverUrl = toCoverUrl(item.cover);
                        return (
                            <article key={anchor} id={anchor} className={styles.card}>
                                <div className={styles.media}>
                                    <Image
                                        src={coverUrl ?? placeholderCover}
                                        width={200}
                                        height={200}
                                        placeholder={coverUrl ? 'empty' : 'blur'}
                                        alt={item.title || ''}
                                        className={styles.cover}
                                    />
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.metaRow}>
                                        <Tag className={styles.metaTag}>
                                            {item.type === 'article' ? 'Artikel' : 'Podcast'}
                                        </Tag>
                                        <time className={styles.date}>{formatDate(item.publishedAt)}</time>
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
                            </article>
                        );
                    })
                )}

                <nav className={styles.pagination} aria-label="Seiten">
                    <div className={styles.pageInfo}>
                        Seite {currentPage}
                    </div>
                    <div className={styles.pageControls}>
                        {prevPage ? (
                            <Link className={styles.pageButton} href={`/?page=${prevPage}`}>
                                Zurück
                            </Link>
                        ) : (
                            <span className={`${styles.pageButton} ${styles.pageButtonDisabled}`} aria-disabled>
                                Zurück
                            </span>
                        )}
                        {nextPage ? (
                            <Link className={styles.pageButton} href={`/?page=${nextPage}`}>
                                Weiter
                            </Link>
                        ) : (
                            <span className={`${styles.pageButton} ${styles.pageButtonDisabled}`} aria-disabled>
                                Weiter
                            </span>
                        )}
                    </div>
                </nav>
            </section>
        </div>
    );
}
