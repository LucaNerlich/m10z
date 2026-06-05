import {type StrapiCategoryRef} from '@/src/lib/strapi/media';

function collectTitles(categories: StrapiCategoryRef[] | undefined): string[] {
    if (!categories?.length) return [];
    const seen = new Set<string>();
    const titles: string[] = [];
    for (const category of categories) {
        const title = category.title?.trim();
        if (!title || seen.has(title)) continue;
        seen.add(title);
        titles.push(title);
    }
    return titles;
}

/**
 * Pick the first non-empty category title as the primary section name.
 * Used for Schema.org `articleSection`.
 */
export function primaryCategoryTitle(categories: StrapiCategoryRef[] | undefined): string | undefined {
    return collectTitles(categories)[0];
}

/**
 * Comma-separated category titles for Schema.org `keywords`.
 * Returns `undefined` when no categories are present.
 */
export function categoryTitlesToKeywords(categories: StrapiCategoryRef[] | undefined): string | undefined {
    const titles = collectTitles(categories);
    return titles.length ? titles.join(', ') : undefined;
}
