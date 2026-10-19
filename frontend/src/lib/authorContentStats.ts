import {type StrapiCategoryRef} from '@/src/lib/strapi/media';

type CategoryCount = {
    slug: string;
    title: string;
    count: number;
};

export type AuthorContentStats = {
    articles: {
        total: number;
        categories: CategoryCount[];
    };
    podcasts: {
        total: number;
        categories: CategoryCount[];
    };
};

type ItemWithCategories = {
    categories?: StrapiCategoryRef[] | null;
};

function computeCategoryCounts(items: ItemWithCategories[]): CategoryCount[] {
    const map = new Map<string, {slug: string; title: string; count: number}>();

    for (const item of items) {
        for (const category of item.categories ?? []) {
            const slug = category.slug ?? '';
            if (!slug) continue;
            const title = category.title ?? slug;
            const existing = map.get(slug);
            if (existing) {
                existing.count += 1;
            } else {
                map.set(slug, {slug, title, count: 1});
            }
        }
    }

    return [...map.values()].sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.title.localeCompare(b.title, 'de');
    });
}

/**
 * Compute totals and category breakdowns for an author's content.
 *
 * Takes the full arrays of an author's articles and podcasts; each `total` is
 * the array length, so the category counts always derive from the same item set
 * as the total.
 */
export function computeAuthorContentStats(
    articles: ItemWithCategories[],
    podcasts: ItemWithCategories[],
): AuthorContentStats {
    return {
        articles: {
            total: articles.length,
            categories: computeCategoryCounts(articles),
        },
        podcasts: {
            total: podcasts.length,
            categories: computeCategoryCounts(podcasts),
        },
    };
}
