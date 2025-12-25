import Image from 'next/image';
import {type StrapiAuthor} from '@/src/lib/rss/media';
import {getOptimalMediaFormat, mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/rss/media';
import styles from './AuthorHeader.module.css';

type AuthorHeaderProps = {
    author: StrapiAuthor;
};

/**
 * Header component for displaying author information on detail pages.
 *
 * Displays avatar, title, and description in a compact, visually appealing layout.
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

