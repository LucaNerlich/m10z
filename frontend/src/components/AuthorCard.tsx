import Image from 'next/image';
import Link from 'next/link';
import {resolveAuthorAvatarUrl, type StrapiAuthor} from '@/src/lib/strapi/media';
import {formatContentCounts} from '@/src/lib/contentCounts';
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
 * Card component for displaying author information.
 *
 * Displays avatar, title, description, and content counts.
 * Links to author detail page.
 */
export function AuthorCard({author, articleCount, podcastCount, className}: AuthorCardProps) {
    const avatarUrl = resolveAuthorAvatarUrl(author);
    const authorUrl = routes.author(author.slug ?? '');

    const cardClasses = [styles.card, className].filter(Boolean).join(' ');
    const contentCounts = formatContentCounts(articleCount, podcastCount);

    return (
        <article className={cardClasses}>
            {avatarUrl ? (
                <div className={styles.avatarContainer}>
                    <Link href={authorUrl} aria-label={`Autorenprofil anzeigen: ${author.title ?? 'Autor'}`}>
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

