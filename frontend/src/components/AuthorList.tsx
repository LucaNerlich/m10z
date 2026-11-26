import Image from 'next/image';
import Link from 'next/link';
import {resolveAuthorAvatarUrl, type StrapiAuthor} from '@/src/lib/strapi/media';
import {formatAuthorList} from '@/src/lib/listFormatters';
import {routes} from '@/src/lib/routes';
import styles from './AuthorList.module.css';

type AuthorListProps = {
    authors: StrapiAuthor[];
    showAvatars?: boolean;
};

/**
 * Render a comma-separated list of authors.
 *
 * Authors are displayed alphabetically by name.
 *
 * @param authors - Array of author objects to display
 * @param showAvatars - If `true`, include each author's avatar when available
 * @returns The JSX element containing the formatted author list, or `null` when `authors` is empty
 */
export function AuthorList({
                               authors,
                               showAvatars = true,
                           }: AuthorListProps) {
    if (authors.length === 0) return null;

    const sortedAuthors = [...authors].sort((a, b) => {
        const nameA = (a.title ?? 'Unbekannter Autor').toLowerCase();
        const nameB = (b.title ?? 'Unbekannter Autor').toLowerCase();
        return nameA.localeCompare(nameB, 'de-DE');
    });

    const authorNames = sortedAuthors.map(author => author.title ?? 'Unbekannter Autor');
    const formattedParts = formatAuthorList(authorNames);
    let authorIndex = 0;

    return (
        <div className={styles.inlineList}>
            {formattedParts.map((part, partIndex) => {
                if (part.type === 'element') {
                    const author = sortedAuthors[authorIndex];
                    const avatarUrl = resolveAuthorAvatarUrl(author);
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
                    return (
                        <span key={`separator-${partIndex}`} className={styles.separator}>
                            {part.value}
                        </span>
                    );
                }
            })}
        </div>
    );
}
