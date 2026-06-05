import {cache} from 'react';

import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';
import {type StrapiAuthor, type StrapiCategoryRef, type StrapiMediaRef} from '@/src/lib/rss/media';
import {CACHE_REVALIDATE_CONTENT_PAGE, CACHE_REVALIDATE_DEFAULT} from '@/src/lib/cache/constants';
import {strapiFetch} from '@/src/lib/strapiTransport';
import {
    ARTICLE_DETAIL_FIELDS,
    ARTICLE_LIST_FIELDS,
    AUTHOR_FIELDS_LIST,
    CATEGORY_FIELDS_LIST,
    MEDIA_FIELDS,
    PODCAST_DETAIL_FIELDS,
    PODCAST_LIST_FIELDS,
    articleDetailPopulate,
    articleListPopulate,
    articleRelatedPopulate,
    authorBySlugPopulate,
    authorListPopulate,
    buildBySlugQuery,
    buildBySlugsQuery,
    buildListQuery,
    categoryWithContentPopulate,
    podcastDetailPopulate,
    podcastListPopulate,
    podcastRelatedPopulate,
    populateAuthorAvatar,
    populateCategory,
} from '@/src/lib/strapi-queries';

export type {StrapiMediaRef};

// Re-exports preserved for back-compat with existing imports (e.g. feed handlers).
export {MEDIA_FIELDS, populateAuthorAvatar, populateCategory};

const MAX_SLUGS = 150;

type FetchOptions = {
    tags: string[];
    revalidate?: number;
    timeout?: number;
    context?: {
        slug?: string;
        contentType?: string;
        populateOptions?: unknown;
    };
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

// Builds hierarchical cache tags for author pages: base type → author → optional category.
// Each level enables increasingly granular invalidation (e.g., invalidate all articles
// vs. only a specific author's articles in a specific category).
export function buildAuthorPageTags(args: {
    contentType: 'article' | 'podcast';
    authorSlug: string;
    categorySlug?: string;
}): string[] {
    const {contentType, authorSlug, categorySlug} = args;

    const baseTypeTag = `strapi:${contentType}`;
    const baseListTag = `strapi:${contentType}:list`;
    const authorTags = ['strapi:author', `strapi:author:${authorSlug}`];

    const tags: string[] = [
        baseTypeTag,
        baseListTag,
        ...authorTags,
        `strapi:${contentType}:list:author:${authorSlug}`,
        `strapi:${contentType}:list:author:${authorSlug}:page`,
    ];

    if (categorySlug) {
        tags.push('strapi:category', `strapi:category:${categorySlug}`);
        tags.push(`strapi:${contentType}:list:author:${authorSlug}:category:${categorySlug}`);
        tags.push(`strapi:${contentType}:list:author:${authorSlug}:category:${categorySlug}:page`);
    }

    return tags;
}

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
    return strapiFetch<T>({
        path: pathWithQuery,
        cache: {mode: 'tags', tags: options.tags, revalidate: options.revalidate},
        timeoutMs: options.timeout,
        diagnosticName: 'strapi.fetchJson',
        context: options.context,
    });
}

async function fetchJsonNoStore<T>(pathWithQuery: string, options: FetchOptions): Promise<T> {
    return strapiFetch<T>({
        path: pathWithQuery,
        cache: {mode: 'no-store'},
        timeoutMs: options.timeout,
        diagnosticName: 'strapi.fetchJsonNoStore',
        context: options.context,
    });
}

export function normalizePagination(
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

    return {page, pageSize, total: totalRaw, pageCount: pageCountRaw};
}

export function toPaginatedResult<T>(
    res: {data?: T[]; meta?: {pagination?: Partial<PaginationMeta>}},
    requestedPage: number,
    requestedPageSize: number,
): PaginatedResult<T> {
    const pagination = normalizePagination(res.meta, requestedPage, requestedPageSize);
    const items = res.data ?? [];
    const hasNextPage = pagination.page < pagination.pageCount;
    return {items, pagination, hasNextPage};
}

export function clampPage(p: number): number {
    return Math.max(1, Math.floor(p));
}

export function clampPageSize(s: number): number {
    return Math.max(1, Math.min(200, Math.floor(s)));
}

// ─── Articles ──────────────────────────────────────────────────────────────

export const fetchArticleBySlug = cache(async (slug: string): Promise<StrapiArticle | null> => {
    const query = buildBySlugQuery({
        slug,
        populate: articleDetailPopulate,
        fields: ARTICLE_DETAIL_FIELDS,
        status: 'published',
    });
    const res = await fetchJson<{data: StrapiArticle[]}>(`/api/articles?${query}`, {
        tags: ['strapi:article', `strapi:article:${slug}`],
        revalidate: CACHE_REVALIDATE_CONTENT_PAGE,
        context: {slug, contentType: 'article', populateOptions: articleDetailPopulate},
    });
    return res.data?.[0] ?? null;
});

type PreviewStatus = 'draft' | 'published';

export async function fetchArticleBySlugForPreview(
    slug: string,
    status: PreviewStatus = 'draft',
): Promise<StrapiArticle | null> {
    const query = buildBySlugQuery({
        slug,
        populate: articleDetailPopulate,
        fields: ARTICLE_DETAIL_FIELDS,
        status,
    });
    const res = await fetchJsonNoStore<{data: StrapiArticle[]}>(`/api/articles?${query}`, {
        tags: [],
        context: {slug, contentType: 'article', populateOptions: articleDetailPopulate},
    });
    return res.data?.[0] ?? null;
}

export const fetchArticlesPage = cache(async (options: FetchPageOptions = {}): Promise<PaginatedResult<StrapiArticle>> => {
    const page = clampPage(options.page ?? 1);
    const pageSize = clampPageSize(options.pageSize ?? 20);

    const query = buildListQuery({
        page,
        pageSize,
        sort: ['date:desc'],
        status: 'published',
        populate: articleListPopulate,
        fields: ARTICLE_LIST_FIELDS,
    });

    const res = await fetchJson<{data: StrapiArticle[]; meta?: {pagination?: Partial<PaginationMeta>}}>(
        `/api/articles?${query}`,
        {
            tags: options.tags ?? ['strapi:article', 'strapi:article:list:page'],
            revalidate: CACHE_REVALIDATE_DEFAULT,
        },
    );

    return toPaginatedResult(res, page, pageSize);
});

export const fetchArticlesList = cache(async (options: FetchListOptions = {}): Promise<StrapiArticle[]> => {
    const limit = options.limit ?? 100;
    const paginated = await fetchArticlesPage({
        page: 1,
        pageSize: limit,
        tags: options.tags ?? ['strapi:article', 'strapi:article:list'],
    });
    return paginated.items;
});

export const fetchArticlesBySlugs = cache(async (slugs: string[]): Promise<StrapiArticle[]> => {
    if (slugs.length === 0) return [];
    if (slugs.length > MAX_SLUGS) {
        throw new Error(
            `fetchArticlesBySlugs: Maximum ${MAX_SLUGS} slugs allowed, but ${slugs.length} were provided. Please batch your requests.`,
        );
    }

    const query = buildBySlugsQuery({
        slugs,
        pageSize: MAX_SLUGS,
        populate: articleDetailPopulate,
        fields: ARTICLE_LIST_FIELDS,
        status: 'published',
    });

    const res = await fetchJson<{data: StrapiArticle[]}>(`/api/articles?${query}`, {
        tags: ['strapi:article', 'strapi:article:by-slugs'],
        revalidate: CACHE_REVALIDATE_DEFAULT,
    });
    return res.data ?? [];
});

export const fetchArticlesBySlugsBatched = cache(async (slugs: string[]): Promise<StrapiArticle[]> => {
    if (slugs.length === 0) return [];
    if (slugs.length <= MAX_SLUGS) return fetchArticlesBySlugs(slugs);

    const chunks: string[][] = [];
    for (let i = 0; i < slugs.length; i += MAX_SLUGS) {
        chunks.push(slugs.slice(i, i + MAX_SLUGS));
    }
    const batches = await Promise.all(chunks.map((chunk) => fetchArticlesBySlugs(chunk)));
    return batches.flat();
});

export const fetchArticlesByAuthorPaginated = cache(
    async (authorSlug: string, page: number, pageSize: number, categorySlug?: string): Promise<PaginatedResult<StrapiArticle>> => {
        const safePage = clampPage(page);
        const safePageSize = clampPageSize(pageSize);

        const query = buildListQuery({
            page: safePage,
            pageSize: safePageSize,
            sort: ['date:desc'],
            status: 'published',
            filters: {
                authors: {slug: {$eq: authorSlug}},
                ...(categorySlug ? {categories: {slug: {$eq: categorySlug}}} : {}),
            },
            populate: articleListPopulate,
            fields: ARTICLE_LIST_FIELDS,
        });

        const res = await fetchJson<{data: StrapiArticle[]; meta?: {pagination?: Partial<PaginationMeta>}}>(
            `/api/articles?${query}`,
            {
                tags: buildAuthorPageTags({contentType: 'article', authorSlug, categorySlug}),
                revalidate: CACHE_REVALIDATE_DEFAULT,
                context: {slug: authorSlug, contentType: 'article', populateOptions: articleListPopulate},
            },
        );

        return toPaginatedResult(res, safePage, safePageSize);
    },
);

const RELATED_CONTENT_LIMIT = 5;

export const fetchRelatedArticles = cache(
    async (categorySlugs: string[], excludeSlug: string): Promise<StrapiArticle[]> => {
        if (categorySlugs.length === 0) return [];

        const query = buildListQuery({
            page: 1,
            pageSize: RELATED_CONTENT_LIMIT,
            sort: ['date:desc'],
            status: 'published',
            filters: {
                slug: {$ne: excludeSlug},
                categories: {slug: {$in: categorySlugs}},
            },
            populate: articleRelatedPopulate,
            fields: ARTICLE_LIST_FIELDS,
        });

        const res = await fetchJson<{data: StrapiArticle[]}>(`/api/articles?${query}`, {
            tags: ['strapi:article', 'related-content'],
            revalidate: CACHE_REVALIDATE_DEFAULT,
        });

        return res.data ?? [];
    },
);

// ─── Podcasts ──────────────────────────────────────────────────────────────

export const fetchPodcastBySlug = cache(async (slug: string): Promise<StrapiPodcast | null> => {
    const query = buildBySlugQuery({
        slug,
        populate: podcastDetailPopulate,
        fields: PODCAST_DETAIL_FIELDS,
        status: 'published',
    });
    const res = await fetchJson<{data: StrapiPodcast[]}>(`/api/podcasts?${query}`, {
        tags: ['strapi:podcast', `strapi:podcast:${slug}`],
        revalidate: CACHE_REVALIDATE_CONTENT_PAGE,
        context: {slug, contentType: 'podcast', populateOptions: podcastDetailPopulate},
    });
    return res.data?.[0] ?? null;
});

export async function fetchPodcastBySlugForPreview(
    slug: string,
    status: PreviewStatus = 'draft',
): Promise<StrapiPodcast | null> {
    const query = buildBySlugQuery({
        slug,
        populate: podcastDetailPopulate,
        fields: PODCAST_DETAIL_FIELDS,
        status,
    });
    const res = await fetchJsonNoStore<{data: StrapiPodcast[]}>(`/api/podcasts?${query}`, {
        tags: [],
        context: {slug, contentType: 'podcast', populateOptions: podcastDetailPopulate},
    });
    return res.data?.[0] ?? null;
}

export const fetchPodcastsPage = cache(async (options: FetchPageOptions = {}): Promise<PaginatedResult<StrapiPodcast>> => {
    const page = clampPage(options.page ?? 1);
    const pageSize = clampPageSize(options.pageSize ?? 20);

    const query = buildListQuery({
        page,
        pageSize,
        sort: ['date:desc'],
        status: 'published',
        populate: podcastListPopulate,
        fields: PODCAST_LIST_FIELDS,
    });

    const res = await fetchJson<{data: StrapiPodcast[]; meta?: {pagination?: Partial<PaginationMeta>}}>(
        `/api/podcasts?${query}`,
        {
            tags: options.tags ?? ['strapi:podcast', 'strapi:podcast:list:page'],
            revalidate: CACHE_REVALIDATE_DEFAULT,
        },
    );

    return toPaginatedResult(res, page, pageSize);
});

export const fetchPodcastsList = cache(async (options: FetchListOptions = {}): Promise<StrapiPodcast[]> => {
    const limit = options.limit ?? 100;
    const paginated = await fetchPodcastsPage({
        page: 1,
        pageSize: limit,
        tags: options.tags ?? ['strapi:podcast', 'strapi:podcast:list'],
    });
    return paginated.items;
});

export const fetchPodcastsBySlugs = cache(async (slugs: string[]): Promise<StrapiPodcast[]> => {
    if (slugs.length === 0) return [];
    if (slugs.length > MAX_SLUGS) {
        throw new Error(
            `fetchPodcastsBySlugs: Maximum ${MAX_SLUGS} slugs allowed, but ${slugs.length} were provided. Please batch your requests.`,
        );
    }

    const query = buildBySlugsQuery({
        slugs,
        pageSize: MAX_SLUGS,
        populate: podcastListPopulate,
        fields: PODCAST_LIST_FIELDS,
        status: 'published',
    });

    const res = await fetchJson<{data: StrapiPodcast[]}>(`/api/podcasts?${query}`, {
        tags: ['strapi:podcast', 'strapi:podcast:by-slugs'],
        revalidate: CACHE_REVALIDATE_DEFAULT,
    });
    return res.data ?? [];
});

export const fetchPodcastsBySlugsBatched = cache(async (slugs: string[]): Promise<StrapiPodcast[]> => {
    if (slugs.length === 0) return [];
    if (slugs.length <= MAX_SLUGS) return fetchPodcastsBySlugs(slugs);

    const chunks: string[][] = [];
    for (let i = 0; i < slugs.length; i += MAX_SLUGS) {
        chunks.push(slugs.slice(i, i + MAX_SLUGS));
    }
    const batches = await Promise.all(chunks.map((chunk) => fetchPodcastsBySlugs(chunk)));
    return batches.flat();
});

export const fetchPodcastsByAuthorPaginated = cache(
    async (authorSlug: string, page: number, pageSize: number, categorySlug?: string): Promise<PaginatedResult<StrapiPodcast>> => {
        const safePage = clampPage(page);
        const safePageSize = clampPageSize(pageSize);

        const query = buildListQuery({
            page: safePage,
            pageSize: safePageSize,
            sort: ['date:desc'],
            status: 'published',
            filters: {
                authors: {slug: {$eq: authorSlug}},
                ...(categorySlug ? {categories: {slug: {$eq: categorySlug}}} : {}),
            },
            populate: podcastListPopulate,
            fields: PODCAST_LIST_FIELDS,
        });

        const res = await fetchJson<{data: StrapiPodcast[]; meta?: {pagination?: Partial<PaginationMeta>}}>(
            `/api/podcasts?${query}`,
            {
                tags: buildAuthorPageTags({contentType: 'podcast', authorSlug, categorySlug}),
                revalidate: CACHE_REVALIDATE_DEFAULT,
                context: {slug: authorSlug, contentType: 'podcast', populateOptions: podcastListPopulate},
            },
        );

        return toPaginatedResult(res, safePage, safePageSize);
    },
);

export const fetchRelatedPodcasts = cache(
    async (categorySlugs: string[], excludeSlug: string): Promise<StrapiPodcast[]> => {
        if (categorySlugs.length === 0) return [];

        const query = buildListQuery({
            page: 1,
            pageSize: RELATED_CONTENT_LIMIT,
            sort: ['date:desc'],
            status: 'published',
            filters: {
                slug: {$ne: excludeSlug},
                categories: {slug: {$in: categorySlugs}},
            },
            populate: podcastRelatedPopulate,
            fields: PODCAST_LIST_FIELDS,
        });

        const res = await fetchJson<{data: StrapiPodcast[]}>(`/api/podcasts?${query}`, {
            tags: ['strapi:podcast', 'related-content'],
            revalidate: CACHE_REVALIDATE_DEFAULT,
        });

        return res.data ?? [];
    },
);

// ─── Authors ───────────────────────────────────────────────────────────────

export type StrapiAuthorWithContent = StrapiAuthor & {
    articles?: Array<{
        slug: string;
        publishedAt?: string | null;
        title: string;
        date?: string | null;
        categories?: StrapiCategoryRef[];
    }>;
    podcasts?: Array<{
        slug: string;
        publishedAt?: string | null;
        title: string;
        date?: string | null;
        categories?: StrapiCategoryRef[];
    }>;
};

export const fetchAuthorsList = cache(async (options: FetchListOptions = {}): Promise<StrapiAuthorWithContent[]> => {
    const limit = options.limit ?? 100;
    const query = buildListQuery({
        page: 1,
        pageSize: limit,
        sort: ['title:asc'],
        populate: authorListPopulate,
        fields: AUTHOR_FIELDS_LIST,
    });

    const res = await fetchJson<{data: StrapiAuthorWithContent[]}>(`/api/authors?${query}`, {
        tags: options.tags ?? ['strapi:author', 'strapi:author:list'],
        revalidate: CACHE_REVALIDATE_DEFAULT,
    });
    return res.data ?? [];
});

export const fetchAuthorBySlug = cache(async (slug: string): Promise<StrapiAuthorWithContent | null> => {
    const query = buildBySlugQuery({
        slug,
        populate: authorBySlugPopulate,
        fields: AUTHOR_FIELDS_LIST,
    });

    const res = await fetchJson<{data: StrapiAuthorWithContent[]}>(`/api/authors?${query}`, {
        tags: ['strapi:author', `strapi:author:${slug}`],
        revalidate: CACHE_REVALIDATE_CONTENT_PAGE,
    });
    return res.data?.[0] ?? null;
});

// ─── Categories ────────────────────────────────────────────────────────────

export type StrapiCategoryWithContent = {
    id: number;
    slug: string;
    title?: string | null;
    description?: string | null;
    date?: string | null;
    cover?: StrapiMediaRef | null;
    banner?: StrapiMediaRef | null;
    articles?: Array<{
        slug: string;
        publishedAt?: string | null;
        title: string;
        date?: string | null;
    }>;
    podcasts?: Array<{
        slug: string;
        publishedAt?: string | null;
        title: string;
        date?: string | null;
    }>;
};

export const fetchCategoryBySlug = cache(async (slug: string): Promise<StrapiCategoryWithContent | null> => {
    const query = buildBySlugQuery({
        slug,
        populate: categoryWithContentPopulate,
        fields: CATEGORY_FIELDS_LIST,
    });

    const res = await fetchJson<{data: StrapiCategoryWithContent[]}>(`/api/categories?${query}`, {
        tags: ['strapi:category', `strapi:category:${slug}`],
        revalidate: CACHE_REVALIDATE_CONTENT_PAGE,
        context: {slug, contentType: 'category', populateOptions: categoryWithContentPopulate},
    });
    return res.data?.[0] ?? null;
});

export const fetchCategoriesWithContent = cache(async (options: FetchListOptions = {}): Promise<StrapiCategoryWithContent[]> => {
    const limit = options.limit ?? 100;
    const query = buildListQuery({
        page: 1,
        pageSize: limit,
        sort: ['title:asc'],
        populate: categoryWithContentPopulate,
        fields: CATEGORY_FIELDS_LIST,
    });

    const res = await fetchJson<{data: StrapiCategoryWithContent[]}>(`/api/categories?${query}`, {
        tags: options.tags ?? ['strapi:category', 'strapi:category:list'],
        revalidate: CACHE_REVALIDATE_DEFAULT,
    });
    return res.data ?? [];
});
