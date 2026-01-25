import Link from 'next/link';
import Image from 'next/image';
import {BookIcon, MusicNoteIcon} from '@phosphor-icons/react/dist/ssr';

import {Tag} from '@/src/components/Tag';
import {Card} from '@/src/components/Card';
import {Pagination} from '@/src/components/Pagination';
import {buildContentFeed} from '@/src/lib/contentFeed';
import {mediaUrlToAbsolute} from '@/src/lib/rss/media';
import {formatDateShort, formatDuration} from '@/src/lib/dateFormatters';
import {calculateReadingTime} from '@/src/lib/readingTime';
import styles from '@/app/page.module.css';
import placeholderCover from '@/public/images/m10z.jpg';
import {umamiEventId} from '@/src/lib/analytics/umami';

const PAGE_SIZE = 10;
const MAX_PAGE = 50;

/**
 * Determine the requested page number from URL search parameters, validated and clamped to the allowed range.
 *
 * @param searchParams - URL search parameters potentially containing a `page` entry
 * @returns The page number as an integer between 1 and `MAX_PAGE` (inclusive); returns 1 for missing, non‑finite, or out‑of‑range values
 */
function parsePageParam(searchParams: URLSearchParams): number {
    const raw = searchParams.get('page');
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.min(Math.floor(parsed), MAX_PAGE);
}

/**
 * Clamp a requested page number to the valid range for the available items.
 *
 * @param page - The requested page number (may be out of range)
 * @param totalItems - Total number of available items
 * @returns The page number clipped to be at least 1 and at most the highest page (ceil(totalItems / PAGE_SIZE)); returns 1 when `totalItems` is 0 or negative
 */
function clampPageToData(page: number, totalItems: number): number {
    if (totalItems <= 0) return 1;
    const maxPage = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    return Math.min(page, maxPage);
}

/**
 * Determines whether a subsequent page exists given the current page and total item count.
 *
 * @returns `true` if there are more items after `currentPage`, `false` otherwise.
 */
function hasNextPage(currentPage: number, totalItems: number): boolean {
    return currentPage * PAGE_SIZE < totalItems;
}

/**
 * Render the client-side homepage feed that displays a combined, paginated list of articles and podcasts.
 *
 * Handles loading, error, and empty states and derives the current page from the URL `page` query parameter.
 *
 * @returns The rendered feed component containing the table of contents, content cards, and pagination controls.
 */
export async function HomePage({page}: {page: number}) {
    let data;
    try {
        data = await buildContentFeed(page, PAGE_SIZE, {tags: ['page:home']});
    } catch {
        return (
            <div className={styles.page}>
                <Card variant="empty">
                    <p>Fehler beim Laden der Inhalte.</p>
                    <a href="/" style={{marginTop: '1rem', padding: '0.5rem 1rem', display: 'inline-block'}}>
                        Erneut versuchen
                    </a>
                </Card>
            </div>
        );
    }

    if (!data || data.items.length === 0) {
        return (
            <div className={styles.page}>
                <Card variant="empty">Keine Inhalte gefunden.</Card>
            </div>
        );
    }

    const combinedTotal = data.pagination.total;
    const currentPage = clampPageToData(page, combinedTotal);
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
                                    <a
                                        href={`#${anchor}`}
                                        className={styles.tocLink}
                                        data-umami-event={umamiEventId(['home', 'toc', item.type, item.slug])}
                                    >
                                        <div className={styles.tocMetadata}>
                                            <Tag
                                                className={styles.tocTag}
                                                icon={item.type === 'article' ? <BookIcon size={14} /> :
                                                    <MusicNoteIcon size={14} />}
                                            >
                                                {item.type === 'article' ? 'Artikel' : 'Podcast'}
                                            </Tag>
                                            {item.publishedAt ? (
                                                <time className={styles.tocDate} dateTime={item.publishedAt}>
                                                    {formatDateShort(item.publishedAt)}
                                                </time>
                                            ) : (
                                                <span
                                                    className={styles.tocDate}>{formatDateShort(item.publishedAt)}</span>
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

                        const coverAlt = item.cover?.alternativeText ?? item.title;
                        const coverTitle = item.cover?.caption ?? undefined;
                        const bannerAlt = item.banner?.alternativeText ?? item.title;
                        const bannerTitle = item.banner?.caption ?? undefined;

                        return (
                            <Card key={anchor} id={anchor}>
                                <div className={styles.media}>
                                    {(() => {
                                        const coverSrc = coverUrl ?? placeholderCover;
                                        const bannerSrc = bannerUrl ?? coverUrl ?? placeholderCover;
                                        const coverUnoptimized = typeof coverSrc === 'string';
                                        const bannerUnoptimized = typeof bannerSrc === 'string';

                                        return (
                                            <Link
                                                href={item.href}
                                                className={styles.mediaLink}
                                                aria-label={`${item.type === 'article' ? 'Artikel' : 'Podcast'} öffnen: ${item.title}`}
                                            >
                                                <Image
                                                    src={coverSrc}
                                                    width={200}
                                                    height={200}
                                                    sizes="200px"
                                                    quality={60}
                                                    unoptimized={coverUnoptimized}
                                                    placeholder={coverPlaceholder}
                                                    blurDataURL={coverBlurDataUrl || undefined}
                                                    alt={coverAlt || ''}
                                                    title={coverTitle}
                                                    className={styles.cover}
                                                />
                                                <Image
                                                    src={bannerSrc}
                                                    width={800}
                                                    height={450}
                                                    sizes="(max-width: 900px) 100vw, 800px"
                                                    quality={60}
                                                    unoptimized={bannerUnoptimized}
                                                    placeholder={bannerPlaceholder}
                                                    blurDataURL={bannerBlurDataUrl || coverBlurDataUrl || undefined}
                                                    alt={bannerAlt || ''}
                                                    title={bannerTitle}
                                                    className={styles.banner}
                                                />
                                            </Link>
                                        );
                                    })()}
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.metaRow}>
                                        <Tag
                                            className={styles.metaTag}
                                            icon={item.type === 'article' ? <BookIcon size={14} /> :
                                                <MusicNoteIcon size={14} />}
                                        >
                                            {item.type === 'article' ? 'Artikel' : 'Podcast'}
                                        </Tag>
                                        {item.type === 'article' && item.wordCount != null ? (
                                            <span className={styles.readingTime}>
                                                {calculateReadingTime(item.wordCount)}
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
