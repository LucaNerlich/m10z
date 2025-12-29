import qs from 'qs';

import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';
import {type StrapiAuthor, type StrapiMediaRef} from '@/src/lib/rss/media';

export type {StrapiMediaRef};

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL?.replace(/\/+$/, '');

if (!STRAPI_URL) {
    throw new Error('Missing NEXT_PUBLIC_STRAPI_URL');
}

const MAX_SLUGS = 150;

type FetchOptions = {
    tags: string[];
};

export type PaginationMeta = {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
};

export type PaginatedResult<T> = {
    items: T[];
    pagination: PaginationMeta;
    hasNextPage: boolean;
};

type FetchListOptions = {
    limit?: number;
    tags?: string[];
};

type FetchPageOptions = {
    page?: number;
    pageSize?: number;
    tags?: string[];
};

async function fetchJson<T>(pathWithQuery: string, options: FetchOptions): Promise<T> {
    const url = new URL(pathWithQuery, STRAPI_URL);
    const res = await fetch(url.toString(), {
        next: {
            tags: options.tags,
        },
    });
    if (!res.ok) {
        throw new Error(`Strapi request failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
}

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
 * Fetches a published article by slug with populated media, authors, categories, and YouTube data.
 *
 * @param slug - The article's slug to look up
 * @returns The matching `StrapiArticle` if found, `null` otherwise
 */
export async function fetchArticleBySlug(slug: string): Promise<StrapiArticle | null> {
    const query = qs.stringify(
        {
            filters: {slug: {$eq: slug}},
            status: 'published',
            populate: {
                base: {
                    populate: {
                        cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                        banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                    },
                    fields: ['title', 'description', 'date'],
                },
                authors: {
                    populate: {avatar: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']}},
                    fields: ['title', 'slug', 'description'],
                },
                categories: {
                    populate: {
                        base: {
                            populate: {
                                cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                                banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
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
    );

    const res = await fetchJson<{data: StrapiArticle[]}>(
        `/api/articles?${query}`,
        {tags: ['strapi:article', `strapi:article:${slug}`]},
    );
    return res.data?.[0] ?? null;
}

/**
 * Fetches a published podcast identified by its slug and returns it with related media, authors, categories, YouTube info, and file populated.
 *
 * @param slug - The podcast's slug to search for
 * @returns The matching `StrapiPodcast` with populated relations, or `null` if no published podcast matches the slug
 */
export async function fetchPodcastBySlug(slug: string): Promise<StrapiPodcast | null> {
    const query = qs.stringify(
        {
            filters: {slug: {$eq: slug}},
            status: 'published',
            populate: {
                base: {
                    populate: {
                        cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                        banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                    },
                    fields: ['title', 'description', 'date'],
                },
                authors: {
                    populate: {avatar: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']}},
                    fields: ['title', 'slug', 'description'],
                },
                categories: {
                    populate: {
                        base: {
                            populate: {
                                cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                                banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
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
    );

    const res = await fetchJson<{data: StrapiPodcast[]}>(
        `/api/podcasts?${query}`,
        {tags: ['strapi:podcast', `strapi:podcast:${slug}`]},
    );
    return res.data?.[0] ?? null;
}

export type StrapiCategoryWithContent = {
    id: number;
    slug: string;
    base?: {
        title?: string | null;
        description?: string | null;
        cover?: StrapiMediaRef | null;
        banner?: StrapiMediaRef | null;
    } | null;
    articles?: Array<{
        slug: string;
        publishedAt?: string | null;
        base: {title: string; date?: string | null};
    }>;
    podcasts?: Array<{
        slug: string;
        publishedAt?: string | null;
        base: {title: string; date?: string | null};
    }>;
};

export type StrapiAuthorWithContent = StrapiAuthor & {
    articles?: Array<{
        slug: string;
        publishedAt?: string | null;
        base: {title: string; date?: string | null};
    }>;
    podcasts?: Array<{
        slug: string;
        publishedAt?: string | null;
        base: {title: string; date?: string | null};
    }>;
};

export async function fetchArticlesList(options: FetchListOptions = {}): Promise<StrapiArticle[]> {
    const limit = options.limit ?? 100;
    const paginated = await fetchArticlesPage({
        page: 1,
        pageSize: limit,
        tags: options.tags ?? ['strapi:article', 'strapi:article:list'],
    });
    return paginated.items;
}

export async function fetchPodcastsList(options: FetchListOptions = {}): Promise<StrapiPodcast[]> {
    const limit = options.limit ?? 100;
    const paginated = await fetchPodcastsPage({
        page: 1,
        pageSize: limit,
        tags: options.tags ?? ['strapi:podcast', 'strapi:podcast:list'],
    });
    return paginated.items;
}

export async function fetchAuthorsList(options: FetchListOptions = {}): Promise<StrapiAuthorWithContent[]> {
    const limit = options.limit ?? 100;
    const query = qs.stringify(
        {
            sort: ['title:asc'],
            pagination: {pageSize: limit, page: 1},
            populate: {
                avatar: true,
                articles: {fields: ['slug', 'publishedAt']},
                podcasts: {fields: ['slug', 'publishedAt']},
            },
            fields: ['slug', 'title', 'description'],
        },
        {encodeValuesOnly: true},
    );

    const res = await fetchJson<{data: StrapiAuthorWithContent[]}>(
        `/api/authors?${query}`,
        {tags: options.tags ?? ['strapi:author', 'strapi:author:list']},
    );
    return res.data ?? [];
}

export async function fetchAuthorBySlug(slug: string): Promise<StrapiAuthorWithContent | null> {
    ;
    const query = qs.stringify(
        {
            filters: {slug: {$eq: slug}},
            populate: {
                avatar: true,
                articles: {populate: {base: {fields: ['title', 'date']}}, fields: ['slug', 'publishedAt']},
                podcasts: {populate: {base: {fields: ['title', 'date']}}, fields: ['slug', 'publishedAt']},
            },
            fields: ['slug', 'title', 'description'],
            pagination: {pageSize: 1},
        },
        {encodeValuesOnly: true},
    );

    const res = await fetchJson<{data: StrapiAuthorWithContent[]}>(
        `/api/authors?${query}`,
        {tags: ['strapi:author', `strapi:author:${slug}`]},
    );
    return res.data?.[0] ?? null;
}

export async function fetchCategoryBySlug(slug: string): Promise<StrapiCategoryWithContent | null> {
    ;
    const query = qs.stringify(
        {
            filters: {slug: {$eq: slug}},
            populate: {
                base: {
                    populate: {
                        cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                        banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                    },
                    fields: ['title', 'description', 'date'],
                },
                articles: {populate: {base: {fields: ['title', 'date']}}, fields: ['slug', 'publishedAt']},
                podcasts: {populate: {base: {fields: ['title', 'date']}}, fields: ['slug', 'publishedAt']},
            },
            fields: ['slug'],
            pagination: {pageSize: 1},
        },
        {encodeValuesOnly: true},
    );

    const res = await fetchJson<{data: StrapiCategoryWithContent[]}>(
        `/api/categories?${query}`,
        {tags: ['strapi:category', `strapi:category:${slug}`]},
    );
    return res.data?.[0] ?? null;
}

export async function fetchCategoriesWithContent(options: FetchListOptions = {}): Promise<StrapiCategoryWithContent[]> {
    const limit = options.limit ?? 100;
    const query = qs.stringify(
        {
            sort: ['base.title:asc'],
            pagination: {pageSize: limit, page: 1},
            populate: {
                base: {
                    populate: {
                        cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                        banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                    },
                    fields: ['title', 'description', 'date'],
                },
                articles: {populate: {base: {fields: ['title', 'date']}}, fields: ['slug', 'publishedAt']},
                podcasts: {populate: {base: {fields: ['title', 'date']}}, fields: ['slug', 'publishedAt']},
            },
            fields: ['slug'],
        },
        {encodeValuesOnly: true},
    );

    const res = await fetchJson<{data: StrapiCategoryWithContent[]}>(
        `/api/categories?${query}`,
        {tags: options.tags ?? ['strapi:category', 'strapi:category:list']},
    );
    return res.data ?? [];
}

/**
 * Retrieve a paginated list of published articles sorted by newest first.
 *
 * @param options - Optional controls: `page` (requested page, defaults to 1), `pageSize` (items per page, defaults to 20, clamped to 1–200), and `tags` (request cache tags override).
 * @returns The fetched result containing `items` (array of articles), `pagination` (`page`, `pageSize`, `pageCount`, `total`), and `hasNextPage`.
 */
export async function fetchArticlesPage(options: FetchPageOptions = {}): Promise<PaginatedResult<StrapiArticle>> {
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const pageSize = Math.max(1, Math.min(200, Math.floor(options.pageSize ?? 20)));

    const query = qs.stringify(
        {
            sort: ['base.date:desc'],
            status: 'published',
            pagination: {pageSize, page},
            populate: {
                base: {populate: ['cover', 'banner'], fields: ['title', 'description', 'date']},
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

    const res = await fetchJson<{data: StrapiArticle[]; meta?: {pagination?: Partial<PaginationMeta>}}>(
        `/api/articles?${query}`,
        {
            tags: options.tags ?? ['strapi:article', 'strapi:article:list:page'],
        },
    );

    return toPaginatedResult(res, page, pageSize);
}

/**
 * Fetch articles that match the given slugs.
 *
 * @param slugs - Array of article slugs to retrieve
 * @returns The list of matching `StrapiArticle` objects; returns an empty array if none match or if `slugs` is empty
 * @throws Error if more than MAX_SLUGS slugs are provided
 */
export async function fetchArticlesBySlugs(slugs: string[]): Promise<StrapiArticle[]> {
    if (slugs.length === 0) return [];
    if (slugs.length > MAX_SLUGS) {
        throw new Error(
            `fetchArticlesBySlugs: Maximum ${MAX_SLUGS} slugs allowed, but ${slugs.length} were provided. Please batch your requests.`,
        );
    }

    const query = qs.stringify(
        {
            filters: {slug: {$in: slugs}},
            status: 'published',
            populate: {
                base: {
                    populate: {
                        cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                        banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                    },
                    fields: ['title', 'description', 'date'],
                },
                authors: {
                    populate: {avatar: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']}},
                    fields: ['title', 'slug', 'description'],
                },
                categories: {
                    populate: {
                        base: {
                            populate: {
                                cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                                banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                            },
                            fields: ['title', 'description'],
                        },
                    },
                    fields: ['slug'],
                },
                youtube: true,
            },
            fields: ['slug', 'wordCount', 'publishedAt'],
            pagination: {pageSize: MAX_SLUGS},
        },
        {encodeValuesOnly: true},
    );

    const res = await fetchJson<{data: StrapiArticle[]}>(
        `/api/articles?${query}`,
        {tags: ['strapi:article', 'strapi:article:by-slugs']},
    );
    return res.data ?? [];
}

/**
 * Retrieve published podcasts that match the provided slugs.
 *
 * @param slugs - Array of podcast slug identifiers to fetch. If empty, the function returns an empty array.
 * @returns An array of matching `StrapiPodcast` objects; returns an empty array if no matches are found.
 * @throws Error if more than `MAX_SLUGS` slugs are provided.
 */
export async function fetchPodcastsBySlugs(slugs: string[]): Promise<StrapiPodcast[]> {
    ;
    if (slugs.length === 0) return [];
    if (slugs.length > MAX_SLUGS) {
        throw new Error(
            `fetchPodcastsBySlugs: Maximum ${MAX_SLUGS} slugs allowed, but ${slugs.length} were provided. Please batch your requests.`,
        );
    }

    const query = qs.stringify(
        {
            filters: {slug: {$in: slugs}},
            status: 'published',
            populate: {
                base: {
                    populate: {
                        cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                        banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                    },
                    fields: ['title', 'description', 'date'],
                },
                authors: {
                    populate: {avatar: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']}},
                    fields: ['title', 'slug', 'description'],
                },
                categories: {
                    populate: {
                        base: {
                            populate: {
                                cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                                banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
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
            pagination: {pageSize: MAX_SLUGS},
        },
        {encodeValuesOnly: true},
    );

    const res = await fetchJson<{data: StrapiPodcast[]}>(
        `/api/podcasts?${query}`,
        {tags: ['strapi:podcast', 'strapi:podcast:by-slugs']},
    );
    return res.data ?? [];
}

/**
 * Retrieve articles for the given slugs, batching requests when the input length exceeds the maximum allowed per request.
 *
 * @param slugs - Array of article slugs to fetch
 * @returns An array of articles whose slugs are included in `slugs` (may be returned in an implementation-defined order)
 */
export async function fetchArticlesBySlugsBatched(slugs: string[]): Promise<StrapiArticle[]> {
    if (slugs.length === 0) return [];
    if (slugs.length <= MAX_SLUGS) {
        return fetchArticlesBySlugs(slugs);
    }

    // Batch requests
    const batches: StrapiArticle[][] = [];
    for (let i = 0; i < slugs.length; i += MAX_SLUGS) {
        const batch = slugs.slice(i, i + MAX_SLUGS);
        batches.push(await fetchArticlesBySlugs(batch));
    }

    return batches.flat();
}

/**
 * Fetches podcasts matching the given slugs and batches requests when the list exceeds MAX_SLUGS.
 *
 * @param slugs - Array of podcast slugs to fetch
 * @returns An array of matching StrapiPodcast objects; returns an empty array if `slugs` is empty or no items are found
 */
export async function fetchPodcastsBySlugsBatched(slugs: string[]): Promise<StrapiPodcast[]> {
    if (slugs.length === 0) return [];
    if (slugs.length <= MAX_SLUGS) {
        return fetchPodcastsBySlugs(slugs);
    }

    // Batch requests
    const batches: StrapiPodcast[][] = [];
    for (let i = 0; i < slugs.length; i += MAX_SLUGS) {
        const batch = slugs.slice(i, i + MAX_SLUGS);
        batches.push(await fetchPodcastsBySlugs(batch));
    }

    return batches.flat();
}

/**
 * Fetches a paginated list of published podcasts from Strapi.
 *
 * The returned podcast items include populated `base` (title, description, date, cover, banner),
 * `categories` (slug and their base title/description and cover/banner), `youtube` (title, url),
 * and `file` fields. Each item also includes `slug`, `duration`, `wordCount`, and `publishedAt`.
 *
 * @param options - Optional settings for the request.
 *   - `page`: Page number to fetch (minimum 1). Defaults to 1.
 *   - `pageSize`: Number of items per page (clamped to 1–200). Defaults to 20.
 *   - `tags`: Optional cache/tracing tags to attach to the fetch request.
 * @returns A PaginatedResult of StrapiPodcast containing the page's items, pagination metadata, and `hasNextPage`.
 */
export async function fetchPodcastsPage(options: FetchPageOptions = {}): Promise<PaginatedResult<StrapiPodcast>> {
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const pageSize = Math.max(1, Math.min(200, Math.floor(options.pageSize ?? 20)));

    const query = qs.stringify(
        {
            sort: ['base.date:desc'],
            status: 'published',
            pagination: {pageSize, page},
            populate: {
                base: {
                    populate: {
                        cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                        banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                    },
                    fields: ['title', 'description', 'date'],
                },
                categories: {
                    populate: {
                        base: {
                            populate: {
                                cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
                                banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText']},
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

    const res = await fetchJson<{data: StrapiPodcast[]; meta?: {pagination?: Partial<PaginationMeta>}}>(
        `/api/podcasts?${query}`,
        {
            tags: options.tags ?? ['strapi:podcast', 'strapi:podcast:list:page'],
        },
    );

    return toPaginatedResult(res, page, pageSize);
}