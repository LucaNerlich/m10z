import Image from 'next/image';
import Link from 'next/link';
import {type StrapiAuthor} from '@/src/lib/rss/media';
import {getOptimalMediaFormat, mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/rss/media';
import {routes} from '@/src/lib/routes';
import styles from './AuthorList.module.css';

type AuthorListProps = {
    authors: StrapiAuthor[];
    showAvatars?: boolean;
    layout?: 'inline' | 'block';
    maxDisplay?: number;
};

/**
 * Component for displaying a list of authors.
 *
 * Supports inline (comma-separated) and block (vertical) layouts.
 * Can display avatars or text-only mode.
 */
export function AuthorList({
    authors,
    showAvatars = true,
    layout = 'inline',
    maxDisplay,
}: AuthorListProps) {
    if (authors.length === 0) return null;

    const displayAuthors = maxDisplay ? authors.slice(0, maxDisplay) : authors;
    const remainingCount = maxDisplay && authors.length > maxDisplay ? authors.length - maxDisplay : 0;

    if (layout === 'block') {
        return (
            <div className={styles.blockList}>
                {displayAuthors.map((author, index) => {
                    const avatarMedia = getOptimalMediaFormat(normalizeStrapiMedia(author.avatar), 'small');
                    const avatarUrl = mediaUrlToAbsolute({media: avatarMedia});
                    const authorUrl = routes.author(author.slug ?? '');
                    const authorTitle = author.title ?? 'Unbekannter Autor';

                    return (
                        <div key={author.id ?? index} className={styles.blockItem}>
                            {showAvatars && avatarUrl ? (
                                <Image
                                    src={avatarUrl}
                                    alt={authorTitle}
                                    width={48}
                                    height={48}
                                    className={styles.blockAvatar}
                                />
                            ) : null}
                            <Link href={authorUrl} className={styles.blockLink}>
                                {authorTitle}
                            </Link>
                        </div>
                    );
                })}
                {remainingCount > 0 ? (
                    <span className={styles.more}>und {remainingCount} weitere</span>
                ) : null}
            </div>
        );
    }

    // Inline layout
    return (
        <div className={styles.inlineList}>
            {displayAuthors.map((author, index) => {
                const avatarMedia = getOptimalMediaFormat(normalizeStrapiMedia(author.avatar), 'small');
                const avatarUrl = mediaUrlToAbsolute({media: avatarMedia});
                const authorUrl = routes.author(author.slug ?? '');
                const authorTitle = author.title ?? 'Unbekannter Autor';
                const isLast = index === displayAuthors.length - 1 && remainingCount === 0;

                return (
                    <span key={author.id ?? index} className={styles.inlineItem}>
                        {showAvatars && avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt={authorTitle}
                                width={32}
                                height={32}
                                className={styles.inlineAvatar}
                            />
                        ) : null}
                        <Link href={authorUrl} className={styles.inlineLink}>
                            {authorTitle}
                        </Link>
                        {!isLast && <span className={styles.separator}>, </span>}
                    </span>
                );
            })}
            {remainingCount > 0 ? (
                <span className={styles.more}>, und {remainingCount} weitere</span>
            ) : null}
        </div>
    );
}

