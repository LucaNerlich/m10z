import Image from 'next/image';
import Link from 'next/link';
import {type StrapiAuthor} from '@/src/lib/rss/media';
import {getOptimalMediaFormat, mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/rss/media';
import {getLineClampCSS} from '@/src/lib/textUtils';
import {routes} from '@/src/lib/routes';
import styles from './AuthorCard.module.css';

type AuthorCardProps = {
    author: StrapiAuthor;
    articleCount?: number;
    podcastCount?: number;
    className?: string;
};

/**
 * Formats content counts into German text.
 */
function formatContentCounts(articleCount?: number, podcastCount?: number): string {
    const parts: string[] = [];
    if (articleCount !== undefined && articleCount > 0) {
        parts.push(`${articleCount} ${articleCount === 1 ? 'Artikel' : 'Artikel'}`);
    }
    if (podcastCount !== undefined && podcastCount > 0) {
        parts.push(`${podcastCount} ${podcastCount === 1 ? 'Podcast' : 'Podcasts'}`);
    }
    return parts.join(', ') || 'Keine Inhalte';
}

/**
 * Card component for displaying author information.
 *
 * Displays avatar, title, description, and content counts.
 * Links to author detail page.
 */
export function AuthorCard({author, articleCount, podcastCount, className}: AuthorCardProps) {
    const avatarMedia = getOptimalMediaFormat(normalizeStrapiMedia(author.avatar), 'small');
    const avatarUrl = mediaUrlToAbsolute({media: avatarMedia});
    const authorUrl = routes.author(author.slug ?? '');

    const cardClasses = [styles.card, className].filter(Boolean).join(' ');
    const contentCounts = formatContentCounts(articleCount, podcastCount);

    return (
        <article className={cardClasses}>
            {avatarUrl ? (
                <div className={styles.avatarContainer}>
                    <Link href={authorUrl}>
                        <Image
                            src={avatarUrl}
                            alt={author.title ?? 'Avatar'}
                            width={64}
                            height={64}
                            className={styles.avatar}
                        />
                    </Link>
                </div>
            ) : null}
            <div className={styles.cardBody}>
                <h2 className={styles.cardTitle}>
                    <Link href={authorUrl} className={styles.cardLink}>
                        {author.title ?? 'Unbekannter Autor'}
                    </Link>
                </h2>
                {author.description ? (
                    <p className={styles.description} style={getLineClampCSS(3)}>
                        {author.description}
                    </p>
                ) : null}
                <div className={styles.contentCounts}>{contentCounts}</div>
            </div>
        </article>
    );
}

