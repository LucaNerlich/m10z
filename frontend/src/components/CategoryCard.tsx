import Link from 'next/link';
import {getLineClampCSS} from '@/src/lib/textUtils';
import {routes} from '@/src/lib/routes';
import styles from './CategoryCard.module.css';

type CategoryCardCategory = {
    slug?: string | null;
    base?: {
        title?: string | null;
        description?: string | null;
        cover?: unknown;
        banner?: unknown;
    } | null;
};

type CategoryCardProps = {
    category: CategoryCardCategory;
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
 * Card component for displaying category information.
 *
 * Displays title, description, and content counts.
 * Links to category detail page.
 */
export function CategoryCard({category, articleCount, podcastCount, className}: CategoryCardProps) {
    const categorySlug = category.slug ?? '';
    const categoryUrl = routes.category(categorySlug);
    const title = category.base?.title ?? categorySlug;
    const description = category.base?.description;
    const contentCounts = formatContentCounts(articleCount, podcastCount);

    const cardClasses = [styles.card, className].filter(Boolean).join(' ');

    return (
        <article className={cardClasses}>
            <div className={styles.cardBody}>
                <h2 className={styles.cardTitle}>
                    <Link href={categoryUrl} className={styles.cardLink}>
                        {title}
                    </Link>
                </h2>
                {description ? (
                    <p className={styles.description} style={getLineClampCSS(3)}>
                        {description}
                    </p>
                ) : null}
                <div className={styles.contentCounts}>{contentCounts}</div>
            </div>
        </article>
    );
}

