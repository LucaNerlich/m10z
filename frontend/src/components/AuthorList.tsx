import Image from 'next/image';
import Link from 'next/link';
import {getOptimalMediaFormat, mediaUrlToAbsolute, normalizeStrapiMedia, type StrapiAuthor} from '@/src/lib/rss/media';
import {formatAuthorList} from '@/src/lib/listFormatters';
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

    // Sort authors alphabetically by name
    const sortedAuthors = [...authors].sort((a, b) => {
        const nameA = (a.title ?? 'Unbekannter Autor').toLowerCase();
        const nameB = (b.title ?? 'Unbekannter Autor').toLowerCase();
        return nameA.localeCompare(nameB, 'de-DE');
    });

    const displayAuthors = maxDisplay ? sortedAuthors.slice(0, maxDisplay) : sortedAuthors;
    const remainingCount = maxDisplay && sortedAuthors.length > maxDisplay ? sortedAuthors.length - maxDisplay : 0;

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
    const authorNames = displayAuthors.map(author => author.title ?? 'Unbekannter Autor');
    const formattedParts = formatAuthorList(authorNames);
    let authorIndex = 0;

    return (
        <div className={styles.inlineList}>
            {formattedParts.map((part, partIndex) => {
                if (part.type === 'element') {
                    const author = displayAuthors[authorIndex];
                    const avatarMedia = getOptimalMediaFormat(normalizeStrapiMedia(author.avatar), 'small');
                    const avatarUrl = mediaUrlToAbsolute({media: avatarMedia});
                    const authorUrl = routes.author(author.slug ?? '');
                    const authorTitle = author.title ?? 'Unbekannter Autor';
                    const currentIndex = authorIndex;
                    authorIndex++;

                    return (
                        <span key={author.id ?? currentIndex} className={styles.inlineItem}>
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
                        </span>
                    );
                } else {
                    // part.type === 'literal'
                    return (
                        <span key={`separator-${partIndex}`} className={styles.separator}>
                            {part.value}
                        </span>
                    );
                }
            })}
            {remainingCount > 0 ? (
                <span className={styles.more}>, und {remainingCount} weitere</span>
            ) : null}
        </div>
    );
}

