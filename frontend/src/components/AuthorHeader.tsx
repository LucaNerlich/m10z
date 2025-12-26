import Image from 'next/image';
import {getOptimalMediaFormat, mediaUrlToAbsolute, normalizeStrapiMedia, type StrapiAuthor} from '@/src/lib/rss/media';
import styles from './AuthorHeader.module.css';

type AuthorHeaderProps = {
    author: StrapiAuthor;
};

/**
 * Render a header showing an author's avatar, name, and optional description.
 *
 * Renders the author's avatar when available, displays the author's title (falls back to "Unbekannter Autor" if missing), and includes the description only when provided.
 *
 * @param author - The author data used to populate avatar, title, and description
 * @returns The header element containing the author's avatar and textual information
 */
export function AuthorHeader({author}: AuthorHeaderProps) {
    const avatar = getOptimalMediaFormat(normalizeStrapiMedia(author.avatar), 'small');
    const avatarUrl = mediaUrlToAbsolute({media: avatar});
    const avatarWidth = 80;
    const avatarHeight = 80;

    return (
        <header className={styles.header}>
            {avatarUrl ? (
                <div className={styles.avatarContainer}>
                    <Image
                        src={avatarUrl}
                        alt={author.title ?? 'Avatar'}
                        width={avatarWidth}
                        height={avatarHeight}
                        className={styles.avatar}
                    />
                </div>
            ) : null}
            <div className={styles.content}>
                <h1 className={styles.title}>{author.title ?? 'Unbekannter Autor'}</h1>
                {author.description ? (
                    <p className={styles.description}>
                        {author.description}
                    </p>
                ) : null}
            </div>
        </header>
    );
}
