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

import {createPrivilegedFeedReader} from '@/src/lib/strapi/contentAccess';

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 50;
const DEFAULT_MAX_ITEMS = 1000;

export type StrapiFeedFetcher = <T>(pathWithQuery: string) => Promise<T>;

/**
 * Build a fetcher bound to a fixed cache-tag set. The returned function
 * forwards every call across the unified Content access read interface as a
 * privileged read, with the production-vs-dev revalidate behaviour.
 */
export function createFeedStrapiFetcher(tags: string[]): StrapiFeedFetcher {
    return createPrivilegedFeedReader(tags);
}

type StrapiCollectionPage<T> = {
    data: unknown[];
    meta?: {pagination?: {page: number; pageCount: number; total: number}};
};

/**
 * Walk a Strapi collection endpoint, capping at `maxItems` total items and
 * `maxPages` requests. Page 1 is fetched first to read pagination meta;
 * subsequent pages are fetched in parallel.
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
    const firstRes = await args.fetcher<StrapiCollectionPage<T>>(
        `${args.apiBasePath}?${firstQuery}`,
    );
    const firstItems = Array.isArray(firstRes.data) ? (firstRes.data as T[]) : [];
    const all: T[] = firstItems.slice(0, maxItems);

    const pagination = firstRes.meta?.pagination;
    if (
        !pagination ||
        pagination.pageCount <= 1 ||
        firstItems.length === 0 ||
        all.length >= maxItems
    ) {
        return all;
    }

    const lastPage = Math.min(pagination.pageCount, maxPages);
    const pageNumbers = Array.from({length: lastPage - 1}, (_, i) => i + 2);
    const results = await Promise.all(
        pageNumbers.map((p) =>
            args.fetcher<StrapiCollectionPage<T>>(
                `${args.apiBasePath}?${args.buildQueryString(p, pageSize)}`,
            ),
        ),
    );

    for (const res of results) {
        const items = Array.isArray(res.data) ? (res.data as T[]) : [];
        const remaining = Math.max(0, maxItems - all.length);
        if (remaining <= 0) break;
        all.push(...items.slice(0, remaining));
    }

    return all;
}

/**
 * Fetch a Strapi single-type endpoint and unwrap the `{data: T}` envelope.
 */
export async function fetchFeedSingle<T>(
    fetcher: StrapiFeedFetcher,
    apiPathWithQuery: string,
): Promise<T> {
    const res = await fetcher<{data: T}>(apiPathWithQuery);
    return res.data;
}
