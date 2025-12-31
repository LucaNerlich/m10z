'use client';

import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import {Tag} from '@/src/components/Tag';
import {Card} from '@/src/components/Card';
import {Pagination} from '@/src/components/Pagination';
import {FeedSkeleton} from '@/src/components/FeedSkeleton';
import {useContentFeed} from '@/src/hooks/useStrapiContent';
import {
    getOptimalMediaFormat,
    mediaUrlToAbsolute,
    pickBannerMedia,
    pickCoverMedia,
    type StrapiMedia,
} from '@/src/lib/rss/media';
import {formatDateShort, formatDuration} from '@/src/lib/dateFormatters';
import {calculateReadingTime} from '@/src/lib/readingTime';
import styles from '@/app/page.module.css';
import placeholderCover from '@/public/images/m10z.jpg';

const PAGE_SIZE = 10;
const MAX_PAGE = 50;

/**
 * Normalize the requested page number from URL search parameters.
 */
function parsePageParam(searchParams: URLSearchParams): number {
    const raw = searchParams.get('page');
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.min(Math.floor(parsed), MAX_PAGE);
}

/**
 * Clamp a requested page number to the valid range based on total available items.
 */
function clampPageToData(page: number, totalItems: number): number {
    if (totalItems <= 0) return 1;
    const maxPage = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    return Math.min(page, maxPage);
}

function hasNextPage(currentPage: number, totalItems: number): boolean {
    return currentPage * PAGE_SIZE < totalItems;
}

/**
 * Client component for the homepage feed.
 * Fetches articles and podcasts using SWR and displays them in a combined, paginated feed.
 */
export function HomePage() {
    const searchParams = useSearchParams();
    const requestedPage = parsePageParam(searchParams);
    const {data, error, isLoading, isValidating} = useContentFeed(requestedPage, PAGE_SIZE);

    // Show loading skeleton
    if (isLoading && !data) {
        return <FeedSkeleton />;
    }

    // Handle errors
    if (error) {
        return (
            <div className={styles.page}>
                <Card variant="empty">
                    <p>Fehler beim Laden der Inhalte.</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{marginTop: '1rem', padding: '0.5rem 1rem'}}
                    >
                        Erneut versuchen
                    </button>
                </Card>
            </div>
        );
    }

    // Handle empty state
    if (!data || data.items.length === 0) {
        return (
            <div className={styles.page}>
                <Card variant="empty">Keine Inhalte gefunden.</Card>
            </div>
        );
    }

    const combinedTotal = data.pagination.total;
    const currentPage = clampPageToData(requestedPage, combinedTotal);
    const currentItems = data.items;
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
                        const coverUrl = mediaUrlToAbsolute({media: item.cover});
                        const bannerUrl = mediaUrlToAbsolute({media: item.banner});

                        // Get blur data URLs from cover and banner
                        const coverBlurDataUrl = item.cover?.blurhash ?? null;
                        const bannerBlurDataUrl = item.banner?.blurhash ?? null;

                        // Determine placeholders - use blur if we have data URL, otherwise empty
                        const coverPlaceholder = coverBlurDataUrl ? 'blur' : coverUrl ? 'empty' : 'blur';
                        const bannerPlaceholder = bannerBlurDataUrl ? 'blur' : bannerUrl || coverUrl ? 'empty' : 'blur';

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
                                        {item.type === 'article' && item.wordCount != null ? (
                                            <span className={styles.readingTime}>
                                                📖&nbsp;{calculateReadingTime(item.wordCount)}
                                            </span>
                                        ) : null}
                                        {item.type === 'podcast' && item.duration != null ? (
                                            <span className={styles.readingTime}>
                                                🎶&nbsp;{formatDuration(item.duration)}
                                            </span>
                                        ) : null}
                                        <time className={styles.date}>{formatDateShort(item.publishedAt)}</time>
                                    </div>
                                    <h2 className={styles.cardTitle}>
                                        <Link href={item.href} className={styles.cardLink}>
                                            {item.title}
                                        </Link>
                                    </h2>
                                    {item.description ? <p className={styles.description}>{item.description}</p> : null}
                                    <div className={styles.cardActions}>
                                        <Link href={item.href} className={styles.readMore}>
                                            {item.type === 'article' ? 'Weiterlesen' : 'Anhören'}
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

