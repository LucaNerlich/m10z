import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';
import {type PaginatedResult} from '@/src/lib/strapiContent';

export type CategoryCount = {
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

function isPaginatedResult<T>(value: unknown): value is PaginatedResult<T> {
    if (!value || typeof value !== 'object') return false;
    return 'items' in value && 'pagination' in value;
}

function computeCategoryCounts(items: Array<StrapiArticle | StrapiPodcast>): CategoryCount[] {
    const map = new Map<string, {slug: string; title: string; count: number}>();

    for (const item of items) {
        for (const category of item.categories ?? []) {
            const slug = category.slug ?? '';
            if (!slug) continue;
            const title = category.base?.title ?? slug;
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

function normalizeInput<T extends StrapiArticle | StrapiPodcast>(
    input: PaginatedResult<T> | T[],
): {items: T[]; total: number} {
    if (isPaginatedResult<T>(input)) {
        return {items: input.items, total: input.pagination.total};
    }
    return {items: input, total: input.length};
}

/**
 * Compute totals and category breakdowns for an author's content.
 *
 * Accepts either full arrays, or PaginatedResult values (in which case `total` is taken from pagination meta).
 */
export function computeAuthorContentStats(
    articles: PaginatedResult<StrapiArticle> | StrapiArticle[],
    podcasts: PaginatedResult<StrapiPodcast> | StrapiPodcast[],
): AuthorContentStats {
    const a = normalizeInput(articles);
    const p = normalizeInput(podcasts);

    return {
        articles: {
            total: a.total,
            categories: computeCategoryCounts(a.items),
        },
        podcasts: {
            total: p.total,
            categories: computeCategoryCounts(p.items),
        },
    };
}


