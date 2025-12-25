import {type StrapiAuthor, type StrapiCategoryRef} from '@/src/lib/rss/media';
import {formatDateShort, formatDuration} from '@/src/lib/dateFormatters';
import {ContentAuthors} from './ContentAuthors';
import {CategoryList} from './CategoryList';
import styles from './ContentMetadata.module.css';

type ContentMetadataProps = {
    publishedDate?: string | null;
    readingTime?: string | null;
    duration?: number | null;
    authors?: StrapiAuthor[];
    categories?: StrapiCategoryRef[];
};

/**
 * Component for displaying content metadata on detail pages (articles, podcasts).
 *
 * Displays published date, reading time (for articles) or duration (for podcasts),
 * authors, and categories in a consistent layout.
 */
export function ContentMetadata({
    publishedDate,
    readingTime,
    duration,
    authors,
    categories,
}: ContentMetadataProps) {
    const hasDateOrTime = publishedDate || readingTime || duration;
    const hasTags = (authors && authors.length > 0) || (categories && categories.length > 0);

    if (!hasDateOrTime && !hasTags) return null;

    return (
        <div className={styles.metaRow}>
            <div className={styles.metaDates}>
                {publishedDate ? (
                    <time dateTime={publishedDate} className={styles.publishedDate}>
                        {formatDateShort(publishedDate)}
                    </time>
                ) : null}
                {readingTime ? (
                    <span className={styles.readingTime}>📖&nbsp;{readingTime}</span>
                ) : null}
                {duration ? (
                    <time className={styles.duration}>🎶&nbsp;{formatDuration(duration)}</time>
                ) : null}
            </div>
            {authors && authors.length > 0 ? <ContentAuthors authors={authors} /> : null}
            {categories && categories.length > 0 ? (
                <CategoryList categories={categories} />
            ) : null}
        </div>
    );
}

