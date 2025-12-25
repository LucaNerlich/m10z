import Image from 'next/image';
import Link from 'next/link';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {mediaUrlToAbsolute, pickBannerOrCoverMedia, getOptimalMediaFormat} from '@/src/lib/rss/media';
import {formatDateShort} from '@/src/lib/dateFormatters';
import {getLineClampCSS} from '@/src/lib/textUtils';
import {routes} from '@/src/lib/routes';
import styles from './ContentCard.module.css';
import placeholderCover from '@/public/images/m10z.jpg';
import {AuthorList} from './AuthorList';
import {CategoryList} from './CategoryList';

type PodcastCardProps = {
    podcast: StrapiPodcast;
    showAuthors?: boolean;
    showCategories?: boolean;
    descriptionLines?: number;
    className?: string;
};

/**
 * Formats duration in seconds to a readable string (e.g., "1:23:45").
 */
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Card component for displaying podcast episode previews.
 *
 * Displays cover image, title, date, description, optional duration, and optional author/category lists.
 * Uses semantic HTML with article element and proper link structure.
 */
export function PodcastCard({
    podcast,
    showAuthors = false,
    showCategories = false,
    descriptionLines = 3,
    className,
}: PodcastCardProps) {
    const bannerOrCoverMedia = pickBannerOrCoverMedia(podcast.base, podcast.categories);
    const optimizedMedia = bannerOrCoverMedia ? getOptimalMediaFormat(bannerOrCoverMedia, 'medium') : undefined;
    const imageUrl = optimizedMedia ? mediaUrlToAbsolute({media: optimizedMedia}) : null;
    const effectiveDate = getEffectiveDate(podcast);
    const formattedDate = formatDateShort(effectiveDate);
    const podcastUrl = routes.podcast(podcast.slug);

    const cardClasses = [styles.card, className].filter(Boolean).join(' ');

    return (
        <article className={cardClasses}>
            <div className={styles.media}>
                <Link href={podcastUrl} className={styles.mediaLink}>
                    <Image
                        src={imageUrl ?? placeholderCover}
                        alt={podcast.base.title}
                        width={optimizedMedia?.width ?? 400}
                        height={optimizedMedia?.height ?? 225}
                        className={styles.cover}
                        placeholder={imageUrl ? 'empty' : 'blur'}
                    />
                </Link>
            </div>
            <div className={styles.cardBody}>
                <div className={styles.metaRow}>
                    <time className={styles.date} dateTime={effectiveDate ?? undefined}>
                        {formattedDate}
                    </time>
                    {podcast.duration ? (
                        <span className={styles.duration}>{formatDuration(podcast.duration)}</span>
                    ) : null}
                </div>
                <h2 className={styles.cardTitle}>
                    <Link href={podcastUrl} className={styles.cardLink}>
                        {podcast.base.title}
                    </Link>
                </h2>
                {podcast.base.description ? (
                    <p className={styles.description} style={getLineClampCSS(descriptionLines)}>
                        {podcast.base.description}
                    </p>
                ) : null}
                {showAuthors && podcast.authors && podcast.authors.length > 0 ? (
                    <AuthorList authors={podcast.authors} showAvatars={false} layout="inline" />
                ) : null}
                {showCategories && podcast.categories && podcast.categories.length > 0 ? (
                    <CategoryList categories={podcast.categories} />
                ) : null}
                <div className={styles.cardActions}>
                    <Link href={podcastUrl} className={styles.readMore}>
                        Anhören
                    </Link>
                </div>
            </div>
        </article>
    );
}

