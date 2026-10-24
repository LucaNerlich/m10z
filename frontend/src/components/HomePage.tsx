import Link from 'next/link';
import {getImageProps} from 'next/image';
import {BookIcon, MusicNoteIcon} from '@phosphor-icons/react/dist/ssr';

import {Tag} from '@/src/components/Tag';
import {Card} from '@/src/components/Card';
import {Pagination} from '@/src/components/Pagination';
import {buildContentFeed} from '@/src/lib/contentFeed';
import {type FeedItem} from '@/src/lib/contentFeed/mergeFeedItems';
import {HOME_PAGE_TAG} from '@/src/lib/shared/contracts/strapi-contract/tags';
import {mediaUrlToAbsolute, type StrapiMedia} from '@/src/lib/strapi/media';
import {formatDateShort, formatDuration} from '@/src/lib/dateFormatters';
import {calculateReadingTimeCompact} from '@/src/lib/readingTime';
import {getErrorMessage} from '@/src/lib/errors';
import styles from '@/app/page.module.css';
import placeholderCover from '@/public/images/m10z.jpg';
import {umamiEventId} from '@/src/lib/analytics/umami';

const PAGE_SIZE = 10;

const MEDIA_SIZES_DESKTOP = '(max-width: 1080px) 100vw, 280px';
const MEDIA_SIZES_MOBILE = '100vw';

/**
 * Card image with art direction: below 1081px the slot is 16:9, so the banner
 * is shown (cover as fallback); above it the slot is 1:1, so the purpose-built
 * cover is shown (a 16:9 banner would lose ~44% of its width there). The
 * `<source>` keeps it to one download per breakpoint, which `next/image` alone
 * cannot do (two `<img>`s would fetch both).
 */
function CardMedia({item, eager}: {item: FeedItem; eager: boolean}) {
    const cover = item.cover?.url ? item.cover : undefined;
    const banner = item.banner?.url ? item.banner : undefined;
    const desktopMedia = cover ?? banner;

    const imageProps = (media: StrapiMedia | undefined, sizes: string) =>
        getImageProps({
            src: mediaUrlToAbsolute({media}) ?? placeholderCover,
            width: media?.width ?? 400,
            height: media?.height ?? 225,
            sizes,
            quality: 60,
            alt: media?.alternativeText ?? item.title,
            title: media?.caption ?? undefined,
            className: styles.mediaImage,
            placeholder: media?.blurhash ? 'blur' : media ? 'empty' : 'blur',
            blurDataURL: media?.blurhash ?? undefined,
            loading: eager ? 'eager' : 'lazy',
            fetchPriority: eager ? 'high' : undefined,
        }).props;

    // Only art-direct when both images exist; otherwise the fallback already
    // is the one the slot needs.
    if (!cover || !banner) return <img {...imageProps(desktopMedia, MEDIA_SIZES_DESKTOP)} />;

    const mobile = imageProps(banner, MEDIA_SIZES_MOBILE);
    return (
        <picture>
            <source media="(max-width: 1080px)" srcSet={mobile.srcSet} sizes={MEDIA_SIZES_MOBILE} />
            <img {...imageProps(cover, MEDIA_SIZES_DESKTOP)} />
        </picture>
    );
}

/**
 * Render the client-side homepage feed that displays a combined, paginated list of articles and podcasts.
 *
 * Handles loading, error, and empty states and derives the current page from the URL `page` query parameter.
 *
 * @returns The rendered feed component containing the table of contents, content cards, and pagination controls.
 */
export async function HomePage({page, maxPage = 50}: {page: number; maxPage?: number}) {
    let data;
    try {
        data = await buildContentFeed(page, PAGE_SIZE, {tags: [HOME_PAGE_TAG]});
    } catch (error) {
        console.error(`HomePage: failed to build content feed for page ${page}:`, getErrorMessage(error));
        return (
            <div className={styles.page}>
                <Card variant="empty">
                    <p>Fehler beim Laden der Inhalte.</p>
                    <Link href="/" style={{marginTop: '1rem', padding: '0.5rem 1rem', display: 'inline-block'}}>
                        Erneut versuchen
                    </Link>
                </Card>
            </div>
        );
    }

    if (data && data.items.length === 0 && data.pagination.total > 0 && page > data.pagination.pageCount) {
        return (
            <div className={styles.page}>
                <Card variant="empty">
                    <p>Diese Seite existiert nicht.</p>
                    <Link href="/" style={{marginTop: '1rem', padding: '0.5rem 1rem', display: 'inline-block'}}>
                        Zur ersten Seite
                    </Link>
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

    const currentPage = data.pagination.page;
    const currentItems = data.items;
    // pageCount comes from the response (real collection totals); the wrapper's
    // page cap still bounds the paginator so it cannot link to a clamped page.
    const lastPage = Math.min(data.pagination.pageCount, maxPage);
    const nextPage = currentPage < lastPage ? currentPage + 1 : null;
    const prevPage = currentPage > 1 ? currentPage - 1 : null;

    return (
        <div className={styles.page}>
            <h1 className="visually-hidden">Mindestens 10 Zeichen</h1>
            <nav className={styles.toc} aria-label="Inhaltsverzeichnis">
                <h2 className={styles.tocTitle}>Inhaltsverzeichnis</h2>
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
                                            icon={item.type === 'article' ? <BookIcon size={14} aria-hidden='true' /> :
                                                <MusicNoteIcon aria-hidden="true" size={14} />}
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
            </nav>

            <section className={styles.feed} aria-label="Neueste Inhalte">
                {currentItems.map((item, index) => {
                    const anchor = `${item.type}-${item.slug}`;

                    return (
                        <Card key={anchor} id={anchor} className={styles.contentCard}>
                            <div className={styles.media}>
                                <Link
                                    href={item.href}
                                    className={styles.mediaLink}
                                    aria-label={`${item.type === 'article' ? 'Artikel' : 'Podcast'} öffnen: ${item.title}`}
                                >
                                    {/* Above-the-fold image of the first card loads eagerly. */}
                                    <CardMedia item={item} eager={index === 0} />
                                </Link>
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.metaRow}>
                                    <Tag
                                        className={styles.metaTag}
                                        icon={item.type === 'article' ? <BookIcon size={14} aria-hidden='true' /> :
                                            <MusicNoteIcon aria-hidden="true" size={14} />}
                                    >
                                        {item.type === 'article' ? 'Artikel' : 'Podcast'}
                                    </Tag>
                                    {item.type === 'article' && item.wordCount != null ? (
                                        <span className={styles.readingTime}>
                                            <BookIcon size={14} aria-hidden='true' />
                                            &nbsp;{calculateReadingTimeCompact(item.wordCount)}
                                        </span>
                                    ) : null}
                                    {item.type === 'podcast' && item.duration != null ? (
                                        <span className={styles.readingTime}>
                                            <MusicNoteIcon size={14} aria-hidden='true' />
                                            &nbsp;{formatDuration(item.duration)}
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
                })}

                <Pagination
                    currentPage={currentPage}
                    totalPages={lastPage}
                    previousHref={prevPage ? `/?page=${prevPage}` : undefined}
                    nextHref={nextPage ? `/?page=${nextPage}` : undefined}
                />
            </section>
        </div>
    );
}
