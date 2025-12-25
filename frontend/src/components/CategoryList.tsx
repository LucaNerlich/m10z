import Link from 'next/link';
import {type StrapiCategoryRef} from '@/src/lib/rss/media';
import {routes} from '@/src/lib/routes';
import {Tag} from './Tag';
import styles from './CategoryList.module.css';

type CategoryListProps = {
    categories: StrapiCategoryRef[];
    showCounts?: boolean;
    maxDisplay?: number;
};

/**
 * Component for displaying a list of categories.
 *
 * Renders categories as tag-like elements with optional count display.
 * Supports horizontal scrolling on mobile and wrapped grid on desktop.
 */
export function CategoryList({categories, showCounts = false, maxDisplay}: CategoryListProps) {
    if (categories.length === 0) return null;

    const displayCategories = maxDisplay ? categories.slice(0, maxDisplay) : categories;
    const remainingCount = maxDisplay && categories.length > maxDisplay ? categories.length - maxDisplay : 0;

    return (
        <div className={styles.list}>
            {displayCategories.map((category, index) => {
                const categorySlug = category.slug ?? '';
                const categoryUrl = routes.category(categorySlug);
                const title = category.base?.title ?? categorySlug;

                return (
                    <Link key={categorySlug || index} href={categoryUrl} className={styles.link}>
                        <Tag className={styles.tag}>{title}</Tag>
                    </Link>
                );
            })}
            {remainingCount > 0 ? (
                <span className={styles.more}>...</span>
            ) : null}
        </div>
    );
}

