/**
 * Shared Strapi-fetch helpers for feed route handlers.
 *
 * The article and audio feed handlers both need to:
 *   1. Call Strapi with feed-specific cache tags and the same env-var defaults.
 *   2. Walk a paginated collection endpoint and accumulate up to `maxItems`.
 *   3. Fetch the single-type Feed channel config and unwrap `{data: …}`.
 *
 * Centralising these here means a query/config change is one edit, not two.
 */

import {
    type StrapiCollectionResponse,
    type StrapiSingleResponse,
} from '@/src/lib/strapi/responses';

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 50;
const DEFAULT_MAX_ITEMS = 1000;

export type StrapiFeedFetcher = <T>(pathWithQuery: string) => Promise<T>;

/**
 * Walk a Strapi collection endpoint, capping at `maxItems` total items and
 * `maxPages` requests. The item cap also bounds the page span, so a page that
 * cannot contribute to `maxItems` is never requested. Page 1 is fetched first
 * to read pagination meta; subsequent pages are fetched in parallel.
 *
 * `resolveMaxItems` is read lazily so callers can express it as
 * `() => Number(process.env.FEED_X_MAX_ITEMS ?? '') || 1000`.
 */
export async function fetchAllPaginated<T>(args: {
    fetcher: StrapiFeedFetcher;
    apiBasePath: string;
    buildQueryString: (page: number, pageSize: number) => string;
    resolveMaxItems?: () => number;
    pageSize?: number;
    maxPages?: number;
}): Promise<T[]> {
    const pageSize = args.pageSize ?? DEFAULT_PAGE_SIZE;
    const maxPages = args.maxPages ?? DEFAULT_MAX_PAGES;
    const maxItems = args.resolveMaxItems?.() ?? DEFAULT_MAX_ITEMS;

    const firstQuery = args.buildQueryString(1, pageSize);
    const firstRes = await args.fetcher<StrapiCollectionResponse<T>>(
        `${args.apiBasePath}?${firstQuery}`,
    );
    const firstItems = Array.isArray(firstRes.data) ? firstRes.data : [];
    const all: T[] = [];
    const seen = new Set<string>();

    function pushItems(items: T[]): void {
        for (const item of items) {
            if (all.length >= maxItems) return;
            const key = feedItemKey(item);
            if (key !== null) {
                if (seen.has(key)) continue;
                seen.add(key);
            }
            all.push(item);
        }
    }

    pushItems(firstItems);

    const pagination = firstRes.meta?.pagination;
    const pageCount = pagination?.pageCount ?? 1;
    if (
        !pagination ||
        pageCount <= 1 ||
        firstItems.length === 0 ||
        all.length >= maxItems
    ) {
        return all;
    }

    // Bound the span by what the cap can consume: a page beyond maxItems/pageSize
    // would only contribute items that are immediately sliced away.
    const lastPage = Math.min(pageCount, maxPages, Math.max(1, Math.ceil(maxItems / pageSize)));
    const pageNumbers = Array.from({length: lastPage - 1}, (_, i) => i + 2);
    const results = await Promise.all(
        pageNumbers.map((p) =>
            args.fetcher<StrapiCollectionResponse<T>>(
                `${args.apiBasePath}?${args.buildQueryString(p, pageSize)}`,
            ),
        ),
    );

    for (const res of results) {
        const items = Array.isArray(res.data) ? res.data : [];
        pushItems(items);
    }

    return all;
}

/**
 * Stable identity for dedupe across parallel offset pages. Strapi's
 * `documentId` is canonical; fall back to `id`, then `slug`.
 */
function feedItemKey(item: unknown): string | null {
    if (!item || typeof item !== 'object') return null;
    const record = item as {documentId?: unknown; id?: unknown; slug?: unknown};
    if (typeof record.documentId === 'string') return `documentId:${record.documentId}`;
    if (typeof record.id === 'number' || typeof record.id === 'string') return `id:${record.id}`;
    if (typeof record.slug === 'string') return `slug:${record.slug}`;
    return null;
}
export async function fetchFeedSingle<T>(
    fetcher: StrapiFeedFetcher,
    apiPathWithQuery: string,
): Promise<T> {
    const res = await fetcher<StrapiSingleResponse<T>>(apiPathWithQuery);
    return res.data;
}
