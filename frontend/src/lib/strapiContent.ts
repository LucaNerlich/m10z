import {cache} from 'react';

import {type StrapiArticle, type StrapiPodcast} from '@/src/lib/strapi/contentTypes';
import {type StrapiAuthor, type StrapiCategoryRef, type StrapiMediaRef} from '@/src/lib/strapi/media';
import {CACHE_REVALIDATE_CONTENT_PAGE, CACHE_REVALIDATE_DEFAULT} from '@/src/lib/cache/constants';
import {
    buildAuthorPageTags,
    contentBySlugsTag,
    contentItemTag,
    contentListPageTag,
    contentListTag,
    contentTag,
    RELATED_CONTENT_TAG,
} from '@/src/lib/strapi/cacheTags';
import {fetchJson, fetchJsonNoStore} from '@/src/lib/strapi/contentAccess';
import {sortByDateDesc} from '@/src/lib/effectiveDate';
import {
    ARTICLE_DETAIL_FIELDS,
    ARTICLE_LIST_FIELDS,
    articleDetailPopulate,
    articleListPopulate,
    articleRelatedPopulate,
    AUTHOR_FIELDS_LIST,
    authorBySlugPopulate,
    authorListPopulate,
    buildBySlugQuery,
    buildBySlugsQuery,
    buildListQuery,
    CATEGORY_FIELDS_LIST,
    categoryWithContentPopulate,
    PODCAST_DETAIL_FIELDS,
    PODCAST_LIST_FIELDS,
    podcastDetailPopulate,
    podcastListPopulate,
    podcastRelatedPopulate,
} from '@/src/lib/strapi-queries';

export type {StrapiMediaRef};

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
const MAX_SLUGS = 150;

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

// ─── Content-type fetchers (articles + podcasts) ─────────────────────────────
//
// Articles and Podcasts are read the same seven ways (by slug, preview by slug,
// paginated list, by-slug list, batched by-slug list, by author, related). A
// ContentDescriptor captures everything that differs between the two — endpoint,
// content-type (used for tags and diagnostics), populate presets, field sets — so the
// read behaviour (batching, tags, pagination, fallbacks) lives in one place instead of
// in mirrored twin functions. The exported per-type fetchers stay the public interface.

type PreviewStatus = 'draft' | 'published';

const RELATED_CONTENT_LIMIT = 5;

type ContentDescriptor = {
    apiPath: string;
    contentType: 'article' | 'podcast';
    detailPopulate: object;
    listPopulate: object;
    relatedPopulate: object;
    // by-slugs reuses the detail population for Articles (authors are needed there) but
    // the lighter list population for Podcasts — preserved from the original fetchers.
    bySlugsPopulate: object;
    detailFields: readonly string[];
    listFields: readonly string[];
};

const ARTICLE_DESCRIPTOR: ContentDescriptor = {
    apiPath: '/api/articles',
    contentType: 'article',
    detailPopulate: articleDetailPopulate,
    listPopulate: articleListPopulate,
    relatedPopulate: articleRelatedPopulate,
    bySlugsPopulate: articleDetailPopulate,
    detailFields: ARTICLE_DETAIL_FIELDS,
    listFields: ARTICLE_LIST_FIELDS,
};

const PODCAST_DESCRIPTOR: ContentDescriptor = {
    apiPath: '/api/podcasts',
    contentType: 'podcast',
    detailPopulate: podcastDetailPopulate,
    listPopulate: podcastListPopulate,
    relatedPopulate: podcastRelatedPopulate,
    bySlugsPopulate: podcastListPopulate,
    detailFields: PODCAST_DETAIL_FIELDS,
    listFields: PODCAST_LIST_FIELDS,
};

function fetchBySlug<T>(desc: ContentDescriptor, slug: string): Promise<T | null> {
    const query = buildBySlugQuery({
        slug,
        populate: desc.detailPopulate,
        fields: desc.detailFields,
        status: 'published',
    });
    return fetchJson<{data: T[]}>(`${desc.apiPath}?${query}`, {
        tags: [contentTag(desc.contentType), contentItemTag(desc.contentType, slug)],
        revalidate: CACHE_REVALIDATE_CONTENT_PAGE,
        context: {slug, contentType: desc.contentType, populateOptions: desc.detailPopulate},
    }).then((res) => res.data?.[0] ?? null);
}

function fetchBySlugForPreview<T>(
    desc: ContentDescriptor,
    slug: string,
    status: PreviewStatus,
): Promise<T | null> {
    const query = buildBySlugQuery({
        slug,
        populate: desc.detailPopulate,
        fields: desc.detailFields,
        status,
    });
    return fetchJsonNoStore<{data: T[]}>(`${desc.apiPath}?${query}`, {
        tags: [],
        context: {slug, contentType: desc.contentType, populateOptions: desc.detailPopulate},
    }).then((res) => res.data?.[0] ?? null);
}

async function fetchPage<T>(desc: ContentDescriptor, options: FetchPageOptions): Promise<PaginatedResult<T>> {
    const page = clampPage(options.page ?? 1);
    const pageSize = clampPageSize(options.pageSize ?? 20);

    const query = buildListQuery({
        page,
        pageSize,
        sort: ['date:desc'],
        status: 'published',
        populate: desc.listPopulate,
        fields: desc.listFields,
    });

    const res = await fetchJson<{data: T[]; meta?: {pagination?: Partial<PaginationMeta>}}>(
        `${desc.apiPath}?${query}`,
        {
            tags: options.tags ?? [contentTag(desc.contentType), contentListPageTag(desc.contentType)],
            revalidate: CACHE_REVALIDATE_DEFAULT,
        },
    );

    return toPaginatedResult(res, page, pageSize);
}

async function fetchBySlugs<T>(desc: ContentDescriptor, slugs: string[]): Promise<T[]> {
    if (slugs.length === 0) return [];
    if (slugs.length > MAX_SLUGS) {
        throw new Error(
            `fetchBySlugs(${desc.contentType}): Maximum ${MAX_SLUGS} slugs allowed, but ${slugs.length} were provided. Please batch your requests.`,
        );
    }

    const query = buildBySlugsQuery({
        slugs,
        pageSize: MAX_SLUGS,
        populate: desc.bySlugsPopulate,
        fields: desc.listFields,
        status: 'published',
    });

    const res = await fetchJson<{data: T[]}>(`${desc.apiPath}?${query}`, {
        tags: [contentTag(desc.contentType), contentBySlugsTag(desc.contentType)],
        revalidate: CACHE_REVALIDATE_DEFAULT,
    });
    return res.data ?? [];
}

// Splits an over-length slug list into MAX_SLUGS chunks and fans out through the
// per-type cached by-slugs fetcher, so each chunk is still memoised per request.
async function batchBySlugs<T>(
    bySlugs: (slugs: string[]) => Promise<T[]>,
    slugs: string[],
): Promise<T[]> {
    if (slugs.length === 0) return [];
    if (slugs.length <= MAX_SLUGS) return bySlugs(slugs);

    const chunks: string[][] = [];
    for (let i = 0; i < slugs.length; i += MAX_SLUGS) {
        chunks.push(slugs.slice(i, i + MAX_SLUGS));
    }
    const batches = await Promise.all(chunks.map((chunk) => bySlugs(chunk)));
    return batches.flat();
}

async function fetchByAuthorPaginated<T>(
    desc: ContentDescriptor,
    authorSlug: string,
    page: number,
    pageSize: number,
    categorySlug?: string,
): Promise<PaginatedResult<T>> {
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
        populate: desc.listPopulate,
        fields: desc.listFields,
    });

    const res = await fetchJson<{data: T[]; meta?: {pagination?: Partial<PaginationMeta>}}>(
        `${desc.apiPath}?${query}`,
        {
            tags: buildAuthorPageTags({contentType: desc.contentType, authorSlug, categorySlug}),
            revalidate: CACHE_REVALIDATE_DEFAULT,
            context: {slug: authorSlug, contentType: desc.contentType, populateOptions: desc.listPopulate},
        },
    );

    return toPaginatedResult(res, safePage, safePageSize);
}

async function fetchRelated<T>(
    desc: ContentDescriptor,
    categorySlugs: string[],
    excludeSlug: string,
): Promise<T[]> {
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
        populate: desc.relatedPopulate,
        fields: desc.listFields,
    });

    const res = await fetchJson<{data: T[]}>(`${desc.apiPath}?${query}`, {
        tags: [contentTag(desc.contentType), RELATED_CONTENT_TAG],
        revalidate: CACHE_REVALIDATE_DEFAULT,
    });

    return res.data ?? [];
}

// ─── Articles ──────────────────────────────────────────────────────────────

export const fetchArticleBySlug = cache(
    (slug: string): Promise<StrapiArticle | null> => fetchBySlug<StrapiArticle>(ARTICLE_DESCRIPTOR, slug),
);

export function fetchArticleBySlugForPreview(
    slug: string,
    status: PreviewStatus = 'draft',
): Promise<StrapiArticle | null> {
    return fetchBySlugForPreview<StrapiArticle>(ARTICLE_DESCRIPTOR, slug, status);
}

export const fetchArticlesPage = cache(
    (options: FetchPageOptions = {}): Promise<PaginatedResult<StrapiArticle>> =>
        fetchPage<StrapiArticle>(ARTICLE_DESCRIPTOR, options),
);

export const fetchArticlesBySlugs = cache(
    (slugs: string[]): Promise<StrapiArticle[]> => fetchBySlugs<StrapiArticle>(ARTICLE_DESCRIPTOR, slugs),
);

export const fetchArticlesBySlugsBatched = cache(
    (slugs: string[]): Promise<StrapiArticle[]> => batchBySlugs(fetchArticlesBySlugs, slugs),
);

export const fetchArticlesByAuthorPaginated = cache(
    (
        authorSlug: string,
        page: number,
        pageSize: number,
        categorySlug?: string,
    ): Promise<PaginatedResult<StrapiArticle>> =>
        fetchByAuthorPaginated<StrapiArticle>(ARTICLE_DESCRIPTOR, authorSlug, page, pageSize, categorySlug),
);

export const fetchRelatedArticles = cache(
    (categorySlugs: string[], excludeSlug: string): Promise<StrapiArticle[]> =>
        fetchRelated<StrapiArticle>(ARTICLE_DESCRIPTOR, categorySlugs, excludeSlug),
);

// ─── Podcasts ──────────────────────────────────────────────────────────────

export const fetchPodcastBySlug = cache(
    (slug: string): Promise<StrapiPodcast | null> => fetchBySlug<StrapiPodcast>(PODCAST_DESCRIPTOR, slug),
);

export function fetchPodcastBySlugForPreview(
    slug: string,
    status: PreviewStatus = 'draft',
): Promise<StrapiPodcast | null> {
    return fetchBySlugForPreview<StrapiPodcast>(PODCAST_DESCRIPTOR, slug, status);
}

export const fetchPodcastsPage = cache(
    (options: FetchPageOptions = {}): Promise<PaginatedResult<StrapiPodcast>> =>
        fetchPage<StrapiPodcast>(PODCAST_DESCRIPTOR, options),
);

export const fetchPodcastsBySlugs = cache(
    (slugs: string[]): Promise<StrapiPodcast[]> => fetchBySlugs<StrapiPodcast>(PODCAST_DESCRIPTOR, slugs),
);

export const fetchPodcastsBySlugsBatched = cache(
    (slugs: string[]): Promise<StrapiPodcast[]> => batchBySlugs(fetchPodcastsBySlugs, slugs),
);

export const fetchPodcastsByAuthorPaginated = cache(
    (
        authorSlug: string,
        page: number,
        pageSize: number,
        categorySlug?: string,
    ): Promise<PaginatedResult<StrapiPodcast>> =>
        fetchByAuthorPaginated<StrapiPodcast>(PODCAST_DESCRIPTOR, authorSlug, page, pageSize, categorySlug),
);

export const fetchRelatedPodcasts = cache(
    (categorySlugs: string[], excludeSlug: string): Promise<StrapiPodcast[]> =>
        fetchRelated<StrapiPodcast>(PODCAST_DESCRIPTOR, categorySlugs, excludeSlug),
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
        tags: options.tags ?? [contentTag('author'), contentListTag('author')],
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
        tags: [contentTag('author'), contentItemTag('author', slug)],
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

export type CategoryPageData = {
    category: StrapiCategoryWithContent;
    articles: StrapiArticle[];
    podcasts: StrapiPodcast[];
};

export const fetchCategoryPageData = cache(async (slug: string): Promise<CategoryPageData | null> => {
    const category = await fetchCategoryBySlug(slug);
    if (!category) return null;

    const articleSlugs = category.articles?.map((a) => a.slug).filter(Boolean) ?? [];
    const podcastSlugs = category.podcasts?.map((p) => p.slug).filter(Boolean) ?? [];

    let articles: StrapiArticle[] = [];
    let podcasts: StrapiPodcast[] = [];

    try {
        [articles, podcasts] = await Promise.all([
            fetchArticlesBySlugsBatched(articleSlugs),
            fetchPodcastsBySlugsBatched(podcastSlugs),
        ]);
    } catch {
        // Graceful degradation — page renders with available content
    }

    return {
        category,
        articles: sortByDateDesc(articles),
        podcasts: sortByDateDesc(podcasts),
    };
});

export const fetchCategoryBySlug = cache(async (slug: string): Promise<StrapiCategoryWithContent | null> => {
    const query = buildBySlugQuery({
        slug,
        populate: categoryWithContentPopulate,
        fields: CATEGORY_FIELDS_LIST,
    });

    const res = await fetchJson<{data: StrapiCategoryWithContent[]}>(`/api/categories?${query}`, {
        tags: [contentTag('category'), contentItemTag('category', slug)],
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
        tags: options.tags ?? [contentTag('category'), contentListTag('category')],
        revalidate: CACHE_REVALIDATE_DEFAULT,
    });
    return res.data ?? [];
});
