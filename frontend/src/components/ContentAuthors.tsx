import {type StrapiAuthor} from '@/src/lib/rss/media';
import {AuthorList} from './AuthorList';
import styles from './ContentAuthors.module.css';

type ContentAuthorsProps = {
    authors: StrapiAuthor[];
    className?: string;
};

/**
 * Component for displaying authors on content detail pages (articles, podcasts).
 *
 * Displays authors with avatars in a clean, compact layout without labels.
 */
export function ContentAuthors({authors, className}: ContentAuthorsProps) {
    if (!authors || authors.length === 0) return null;

    const classes = [styles.authors, className].filter(Boolean).join(' ');

    return (
        <div className={classes}>
            <AuthorList authors={authors} showAvatars={true} layout="inline" />
        </div>
    );
}

