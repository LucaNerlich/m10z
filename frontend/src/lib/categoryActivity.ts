import {getEffectiveDate, toDateTimestamp, type PublishableWithContentDate} from '@/src/lib/effectiveDate';
import {type StrapiCategoryWithContent} from '@/src/lib/strapiContent';

const DEFAULT_CATEGORY_ACTIVE_MONTHS = 6;

/**
 * Reads the "active window" (in months) from `CATEGORY_ACTIVE_MONTHS`.
 * Falls back to 6 months when unset, non-numeric, or not a positive integer.
 */
export function getCategoryActiveMonths(): number {
    const raw = process.env.CATEGORY_ACTIVE_MONTHS?.trim();
    if (!raw) return DEFAULT_CATEGORY_ACTIVE_MONTHS;

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_CATEGORY_ACTIVE_MONTHS;

    return parsed;
}

/**
 * Human-readable dative label of the active window for German UI text,
 * e.g. "den letzten 6 Monaten" or "dem letzten Monat".
 */
export function getCategoryActiveWindowLabel(): string {
    const months = getCategoryActiveMonths();
    return months === 1 ? 'dem letzten Monat' : `den letzten ${months} Monaten`;
}

function hasContent(category: StrapiCategoryWithContent): boolean {
    return Boolean(
        (category.articles && category.articles.length > 0) || (category.podcasts && category.podcasts.length > 0),
    );
}

/**
 * A category is "recently active" when at least one of its articles or podcasts
 * has an effective date (`date` falling back to `publishedAt`) within the
 * configured window before `now`.
 */
export function isCategoryRecentlyActive(category: StrapiCategoryWithContent, now: Date = new Date()): boolean {
    const months = getCategoryActiveMonths();
    const cutoff = new Date(now);
    const cutoffDay = cutoff.getUTCDate();
    cutoff.setUTCDate(1);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
    const lastDayOfCutoffMonth = new Date(
        Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)
    ).getUTCDate();
    cutoff.setUTCDate(Math.min(cutoffDay, lastDayOfCutoffMonth));
    const nowTimestamp = now.getTime();

    const items: PublishableWithContentDate[] = [...(category.articles ?? []), ...(category.podcasts ?? [])];

    return items.some((item) => {
        const timestamp = toDateTimestamp(getEffectiveDate(item));
        return timestamp !== null && timestamp >= cutoff.getTime() && timestamp <= nowTimestamp;
    });
}

export type SplitCategoriesByActivityResult = {
    /** Categories with content published within the configured window. */
    active: StrapiCategoryWithContent[];
    /** Categories with content, but nothing published within the window. */
    archived: StrapiCategoryWithContent[];
};

function sortByTitle(a: StrapiCategoryWithContent, b: StrapiCategoryWithContent): number {
    return (a.title ?? '').localeCompare(b.title ?? '', 'de');
}

/**
 * Splits categories into "active" and "archived" sections for /kategorien.
 * Categories without any articles or podcasts are dropped entirely.
 * Both result arrays are sorted alphabetically by title.
 */
export function splitCategoriesByActivity(
    categories: StrapiCategoryWithContent[],
    now: Date = new Date(),
): SplitCategoriesByActivityResult {
    const withContent = categories.filter(hasContent);
    const active: StrapiCategoryWithContent[] = [];
    const archived: StrapiCategoryWithContent[] = [];

    for (const category of withContent) {
        if (isCategoryRecentlyActive(category, now)) {
            active.push(category);
        } else {
            archived.push(category);
        }
    }

    return {
        active: active.sort(sortByTitle),
        archived: archived.sort(sortByTitle),
    };
}
