'use client';

import useSWR from 'swr';
import qs from 'qs';

import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';
import {type PaginatedResult, type PaginationMeta} from '@/src/lib/strapiContent';
import {getEffectiveDate, sortByDateDesc, toDateTimestamp} from '@/src/lib/effectiveDate';
import {getOptimalMediaFormat, pickBannerMedia, pickCoverMedia} from '@/src/lib/rss/media';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL?.replace(/\/+$/, '');

if (!STRAPI_URL) {
    throw new Error('Missing NEXT_PUBLIC_STRAPI_URL');
}

/**
 * Fetches JSON from the given Strapi API URL and returns the parsed response.
 *
 * @param url - The full request URL to fetch
 * @returns The parsed JSON response cast to `T`
 * @throws Error if the HTTP response status is not OK
 */
async function fetcher<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Strapi request failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
}

/**
 * Normalize Strapi pagination metadata into a consistent PaginationMeta object.
 *
 * @param meta - Strapi response metadata which may include a `pagination` object
 * @param fallbackPage - Default page number to use when metadata is missing or invalid
 * @param fallbackPageSize - Default page size to use when metadata is missing or invalid
 * @returns A PaginationMeta with `page` (minimum 1), `pageSize` (1–200), `total` (minimum 0), and `pageCount` (at least 1)
 */
function normalizePagination(
    meta: {pagination?: Partial<PaginationMeta>} | undefined,
    fallbackPage: number,
    fallbackPageSize: number,
): PaginationMeta {
    const raw = meta?.pagination ?? {};
    const page = Number.isFinite(raw.page) ? Math.max(1, Math.floor(raw.page as number)) : fallbackPage;
    const pageSize =
        Number.isFinite(raw.pageSize) && (raw.pageSize as number) > 0
            ? Math.min(200, Math.floor(raw.pageSize as number))
            : fallbackPageSize;
    const totalRaw = Number.isFinite(raw.total) ? Math.max(0, Math.floor(raw.total as number)) : 0;
    const pageCountRaw =
        Number.isFinite(raw.pageCount) && (raw.pageCount as number) > 0
            ? Math.floor(raw.pageCount as number)
            : pageSize > 0
                ? Math.max(1, Math.ceil(totalRaw / pageSize))
                : 1;

    return {
        page,
        pageSize,
        total: totalRaw,
        pageCount: pageCountRaw,
    };
}

/**
 * Convert a Strapi list response into a PaginatedResult.
 *
 * Normalizes pagination using the provided requested page and page size, uses `res.data` or an empty array for items, and sets `hasNextPage` when the normalized page is less than the page count.
 *
 * @param res - Strapi response object with optional `data` array and optional `meta.pagination`
 * @param requestedPage - The page number requested by the caller (used as fallback/default in normalization)
 * @param requestedPageSize - The page size requested by the caller (used as fallback/default in normalization)
 * @returns A PaginatedResult with `items` (from `res.data` or `[]`), normalized `pagination`, and `hasNextPage` indicating whether a subsequent page exists
 */
function toPaginatedResult<T>(
    res: {data?: T[]; meta?: {pagination?: Partial<PaginationMeta>}},
    requestedPage: number,
    requestedPageSize: number,
): PaginatedResult<T> {
    const pagination = normalizePagination(res.meta, requestedPage, requestedPageSize);
    const items = res.data ?? [];
    const hasNextPage = pagination.page < pagination.pageCount;
    return {items, pagination, hasNextPage};
}

/**
 * SWR hook for fetching a paginated list of published articles.
 *
 * @param page - Page number (defaults to 1)
 * @param pageSize - Items per page (defaults to 20, clamped to 1-200)
 * @returns SWR result with PaginatedResult<StrapiArticle> data
 */
export function useArticlesList(page: number = 1, pageSize: number = 20) {
    const normalizedPage = Math.max(1, Math.floor(page));
    const normalizedPageSize = Math.max(1, Math.min(200, Math.floor(pageSize)));

    const query = qs.stringify(
        {
            sort: ['base.date:desc'],
            status: 'published',
            pagination: {pageSize: normalizedPageSize, page: normalizedPage},
            populate: {
                base: {
                    populate: {
                        cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                        banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                    },
                    fields: ['title', 'description', 'date'],
                },
                categories: {
                    populate: {base: {populate: ['cover', 'banner'], fields: ['title', 'description']}},
                    fields: ['slug'],
                },
                youtube: true,
            },
            fields: ['slug', 'wordCount', 'publishedAt'],
        },
        {encodeValuesOnly: true},
    );

    const url = `${STRAPI_URL}/api/articles?${query}`;
    const {data, error, isLoading, isValidating} = useSWR<{data: StrapiArticle[]; meta?: {pagination?: Partial<PaginationMeta>}}>(
        url,
        fetcher,
    );

    return {
        data: data ? toPaginatedResult(data, normalizedPage, normalizedPageSize) : undefined,
        error,
        isLoading,
        isValidating,
    };
}

/**
 * SWR hook for fetching a paginated list of published podcasts.
 *
 * @param page - Page number (defaults to 1)
 * @param pageSize - Items per page (defaults to 20, clamped to 1-200)
 * @returns SWR result with PaginatedResult<StrapiPodcast> data
 */
export function usePodcastsList(page: number = 1, pageSize: number = 20) {
    const normalizedPage = Math.max(1, Math.floor(page));
    const normalizedPageSize = Math.max(1, Math.min(200, Math.floor(pageSize)));

    const query = qs.stringify(
        {
            sort: ['base.date:desc'],
            status: 'published',
            pagination: {pageSize: normalizedPageSize, page: normalizedPage},
            populate: {
                base: {
                    populate: {
                        cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                        banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                    },
                    fields: ['title', 'description', 'date'],
                },
                categories: {
                    populate: {
                        base: {
                            populate: {
                                cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                                banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                            },
                            fields: ['title', 'description'],
                        },
                    },
                    fields: ['slug'],
                },
                youtube: {fields: ['title', 'url']},
                file: {populate: '*'},
            },
            fields: ['slug', 'duration', 'wordCount', 'publishedAt'],
        },
        {encodeValuesOnly: true},
    );

    const url = `${STRAPI_URL}/api/podcasts?${query}`;
    const {data, error, isLoading, isValidating} = useSWR<{data: StrapiPodcast[]; meta?: {pagination?: Partial<PaginationMeta>}}>(
        url,
        fetcher,
    );

    return {
        data: data ? toPaginatedResult(data, normalizedPage, normalizedPageSize) : undefined,
        error,
        isLoading,
        isValidating,
    };
}

/**
 * Fetches a single published article by slug and exposes its SWR-backed state.
 *
 * @param slug - Article slug; pass `null` or `undefined` to disable fetching
 * @param initialData - Optional initial article for hydration; pass `null` to indicate no article
 * @returns An object with `data` containing the found `StrapiArticle` or `null`, and `error`, `isLoading`, and `isValidating` state flags
 */
export function useArticle(slug: string | null | undefined, initialData?: StrapiArticle | null) {
    const shouldFetch = slug != null && slug.length > 0;

    const query = shouldFetch
        ? qs.stringify(
              {
                  filters: {slug: {$eq: slug}},
                  status: 'published',
                  populate: {
                      base: {
                          populate: {
                              cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                              banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                          },
                          fields: ['title', 'description', 'date'],
                      },
                      authors: {
                          populate: {avatar: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']}},
                          fields: ['title', 'slug', 'description'],
                      },
                      categories: {
                          populate: {
                              base: {
                                  populate: {
                                      cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                                      banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                                  },
                                  fields: ['title', 'description'],
                              },
                          },
                          fields: ['slug'],
                      },
                      youtube: true,
                  },
                  fields: ['slug', 'content', 'wordCount', 'publishedAt'],
                  pagination: {pageSize: 1},
              },
              {encodeValuesOnly: true},
          )
        : null;

    const url = query ? `${STRAPI_URL}/api/articles?${query}` : null;
    const {data, error, isLoading, isValidating} = useSWR<{data: StrapiArticle[]}>(
        url,
        fetcher,
        {
            fallbackData: initialData !== undefined ? (initialData ? {data: [initialData]} : {data: []}) : undefined,
        },
    );

    return {
        data: data?.data?.[0] ?? null,
        error,
        isLoading,
        isValidating,
    };
}

/**
 * Fetches a single published podcast by slug using SWR.
 *
 * @param slug - Podcast slug; when `null` or empty the fetch is disabled
 * @param initialData - Optional server-side hydrated podcast used as initial data
 * @returns The matching published `StrapiPodcast` as `data` or `null`, together with SWR state (`error`, `isLoading`, `isValidating`)
 */
export function usePodcast(slug: string | null | undefined, initialData?: StrapiPodcast | null) {
    const shouldFetch = slug != null && slug.length > 0;

    const query = shouldFetch
        ? qs.stringify(
              {
                  filters: {slug: {$eq: slug}},
                  status: 'published',
                  populate: {
                      base: {
                          populate: {
                              cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                              banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                          },
                          fields: ['title', 'description', 'date'],
                      },
                      authors: {
                          populate: {avatar: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']}},
                          fields: ['title', 'slug', 'description'],
                      },
                      categories: {
                          populate: {
                              base: {
                                  populate: {
                                      cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                                      banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                                  },
                                  fields: ['title', 'description'],
                              },
                          },
                          fields: ['slug'],
                      },
                      youtube: {fields: ['title', 'url']},
                      file: {populate: '*'},
                  },
                  fields: ['slug', 'duration', 'shownotes', 'wordCount', 'publishedAt'],
                  pagination: {pageSize: 1},
              },
              {encodeValuesOnly: true},
          )
        : null;

    const url = query ? `${STRAPI_URL}/api/podcasts?${query}` : null;
    const {data, error, isLoading, isValidating} = useSWR<{data: StrapiPodcast[]}>(
        url,
        fetcher,
        {
            fallbackData: initialData !== undefined ? (initialData ? {data: [initialData]} : {data: []}) : undefined,
        },
    );

    return {
        data: data?.data?.[0] ?? null,
        error,
        isLoading,
        isValidating,
    };
}

type FeedItem =
    | {
          type: 'article';
          slug: string;
          title: string;
          description?: string | null;
          publishedAt?: string | null;
          cover?: any;
          banner?: any;
          wordCount?: number | null;
          href: string;
      }
    | {
          type: 'podcast';
          slug: string;
          title: string;
          description?: string | null;
          publishedAt?: string | null;
          cover?: any;
          banner?: any;
          wordCount?: number | null;
          duration?: number | null;
          href: string;
      };

type ContentFeedResult = {
    items: FeedItem[];
    pagination: PaginationMeta;
    hasNextPage: boolean;
};

/**
 * Fetches articles and podcasts in parallel, merges them by published date, and returns the requested page of the combined feed.
 *
 * Fetches enough items from each source to satisfy the requested pagination (up to 200), maps content to a unified FeedItem shape, sorts by `publishedAt`, and slices the combined list according to `page` and `pageSize`.
 *
 * @param page - 1-based page number to return
 * @param pageSize - Number of items per page
 * @returns An object with `data` (the merged, paginated feed or `undefined` if no source returned data), `error` (first encountered fetch error or `undefined`), `isLoading`, and `isValidating`
 */
export function useContentFeed(page: number = 1, pageSize: number = 10) {
    // Fetch enough items to cover pagination (buffer approach like original)
    const fetchCount = Math.min(pageSize * page + pageSize, 200);

    const articlesResult = useArticlesList(1, fetchCount);
    const podcastsResult = usePodcastsList(1, fetchCount);

    // Determine loading state
    const isLoading = articlesResult.isLoading || podcastsResult.isLoading;
    const isValidating = articlesResult.isValidating || podcastsResult.isValidating;

    // Handle errors - allow partial data if one fetch succeeds
    const error = articlesResult.error || podcastsResult.error;

    // Process data if available
    let data: ContentFeedResult | undefined = undefined;

    if (articlesResult.data || podcastsResult.data) {
        const articles = articlesResult.data?.items ?? [];
        const podcasts = podcastsResult.data?.items ?? [];

        // Sort each list by date
        const sortedArticles = sortByDateDesc(articles);
        const sortedPodcasts = sortByDateDesc(podcasts);

        // Map to feed items
        const articleItems: FeedItem[] = sortedArticles.map((article) => {
            const effectiveDescription = article.base.description || article.categories?.[0]?.base?.description;
            return {
                type: 'article',
                slug: article.slug,
                title: article.base.title,
                description: effectiveDescription,
                publishedAt: getEffectiveDate(article),
                cover: getOptimalMediaFormat(pickCoverMedia(article.base, article.categories), 'medium'),
                banner: getOptimalMediaFormat(pickBannerMedia(article.base, article.categories), 'medium'),
                wordCount: article.wordCount ?? null,
                href: `/artikel/${article.slug}`,
            };
        });

        const podcastItems: FeedItem[] = sortedPodcasts.map((podcast) => {
            const effectiveDescription = podcast.base.description || podcast.categories?.[0]?.base?.description;
            return {
                type: 'podcast',
                slug: podcast.slug,
                title: podcast.base.title,
                description: effectiveDescription,
                publishedAt: getEffectiveDate(podcast),
                cover: getOptimalMediaFormat(pickCoverMedia(podcast.base, podcast.categories), 'medium'),
                banner: getOptimalMediaFormat(pickBannerMedia(podcast.base, podcast.categories), 'medium'),
                wordCount: podcast.wordCount ?? null,
                duration: podcast.duration ?? null,
                href: `/podcasts/${podcast.slug}`,
            };
        });

        // Combine and sort by publishedAt
        const allItems = [...articleItems, ...podcastItems].sort((a, b) => {
            const ad = toDateTimestamp(a.publishedAt) ?? 0;
            const bd = toDateTimestamp(b.publishedAt) ?? 0;
            return bd - ad;
        });

        // Calculate pagination
        const combinedTotal = allItems.length;
        const normalizedPage = Math.max(1, Math.floor(page));
        const normalizedPageSize = Math.max(1, Math.floor(pageSize));
        const offset = (normalizedPage - 1) * normalizedPageSize;
        const paginatedItems = allItems.slice(offset, offset + normalizedPageSize);
        const maxPage = Math.max(1, Math.ceil(combinedTotal / normalizedPageSize));
        const hasNextPage = normalizedPage < maxPage;

        data = {
            items: paginatedItems,
            pagination: {
                page: normalizedPage,
                pageSize: normalizedPageSize,
                total: combinedTotal,
                pageCount: maxPage,
            },
            hasNextPage,
        };
    }

    return {
        data,
        error,
        isLoading,
        isValidating,
    };
}
