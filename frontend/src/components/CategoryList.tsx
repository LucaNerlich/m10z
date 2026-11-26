import Link from 'next/link';
import {type StrapiCategoryRef} from '@/src/lib/strapi/media';
import {routes} from '@/src/lib/routes';
import {Tag} from './Tag';
import styles from './CategoryList.module.css';

type CategoryListProps = {
    categories: StrapiCategoryRef[];
};

/**
 * Component for displaying a list of categories.
 *
 * Renders categories as tag-like elements.
 * Supports horizontal scrolling on mobile and wrapped grid on desktop.
 */
export function CategoryList({categories}: CategoryListProps) {
    if (categories.length === 0) return null;

    return (
        <div className={styles.list}>
            {categories.map((category, index) => {
                const categorySlug = category.slug ?? '';
                const categoryUrl = routes.category(categorySlug);
                const title = category.title ?? categorySlug;

                return (
                    <Link key={categorySlug || index} href={categoryUrl} className={styles.link}>
                        <Tag className={styles.tag}>{title}</Tag>
                    </Link>
                );
            })}
        </div>
    );
}

