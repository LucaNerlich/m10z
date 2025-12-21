import qs from 'qs';

import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';
import {type StrapiAuthor} from '@/src/lib/rss/media';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL?.replace(/\/+$/, '');

if (!STRAPI_URL) {
    throw new Error('Missing NEXT_PUBLIC_STRAPI_URL');
}

type FetchOptions = {
    tags: string[];
    revalidate?: number;
};

async function fetchJson<T>(pathWithQuery: string, options: FetchOptions): Promise<T> {
    'use cache'
    const url = new URL(pathWithQuery, STRAPI_URL);
    const res = await fetch(url.toString(), {
        next: {
            revalidate: options.revalidate ?? 3600,
            tags: options.tags,
        },
    });
    if (!res.ok) {
        throw new Error(`Strapi request failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
}

export async function fetchArticleBySlug(slug: string): Promise<StrapiArticle | null> {
    'use cache'
    const query = qs.stringify(
        {
            filters: {slug: {$eq: slug}},
            populate: {
                base: {populate: ['cover', 'banner'], fields: ['title', 'description']},
                authors: {populate: ['avatar'], fields: ['title', 'slug', 'description']},
                categories: {
                    populate: {base: {populate: ['cover', 'banner'], fields: ['title', 'description']}},
                    fields: ['slug'],
                },
            },
            fields: ['slug', 'content', 'publishDate', 'publishedAt'],
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

export async function fetchPodcastBySlug(slug: string): Promise<StrapiPodcast | null> {
    'use cache'
    const query = qs.stringify(
        {
            filters: {slug: {$eq: slug}},
            populate: {
                base: {populate: ['cover', 'banner'], fields: ['title', 'description']},
                authors: {populate: ['avatar'], fields: ['title', 'slug', 'description']},
                categories: {
                    populate: {base: {populate: ['cover', 'banner'], fields: ['title', 'description']}},
                    fields: ['slug'],
                },
                file: {populate: '*'},
            },
            fields: ['slug', 'duration', 'shownotes', 'publishDate', 'publishedAt'],
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

type FetchListOptions = {
    limit?: number;
    tags?: string[];
};

export type StrapiCategoryWithContent = {
    id: number;
    slug: string;
    base?: {
        title?: string | null;
        description?: string | null;
        cover?: unknown;
        banner?: unknown;
    } | null;
    articles?: Array<{
        slug: string;
        publishDate?: string | null;
        publishedAt?: string | null;
        base: {title: string};
    }>;
    podcasts?: Array<{
        slug: string;
        publishDate?: string | null;
        publishedAt?: string | null;
        base: {title: string};
    }>;
};

export type StrapiAuthorWithContent = StrapiAuthor & {
    articles?: Array<{
        slug: string;
        publishDate?: string | null;
        publishedAt?: string | null;
        base: {title: string};
    }>;
    podcasts?: Array<{
        slug: string;
        publishDate?: string | null;
        publishedAt?: string | null;
        base: {title: string};
    }>;
};

export async function fetchArticlesList(options: FetchListOptions = {}): Promise<StrapiArticle[]> {
    'use cache'
    const limit = options.limit ?? 100;
    const query = qs.stringify(
        {
            sort: ['publishDate:desc'],
            pagination: {pageSize: limit, page: 1},
            populate: {
                base: {populate: ['cover', 'banner'], fields: ['title', 'description']},
            },
            fields: ['slug', 'content', 'publishDate', 'publishedAt'],
        },
        {encodeValuesOnly: true},
    );

    const res = await fetchJson<{data: StrapiArticle[]}>(
        `/api/articles?${query}`,
        {tags: options.tags ?? ['strapi:article', 'strapi:article:list']},
    );
    return res.data ?? [];
}

export async function fetchPodcastsList(options: FetchListOptions = {}): Promise<StrapiPodcast[]> {
    'use cache'
    const limit = options.limit ?? 100;
    const query = qs.stringify(
        {
            sort: ['publishDate:desc'],
            pagination: {pageSize: limit, page: 1},
            populate: {
                base: {populate: ['cover', 'banner'], fields: ['title', 'description']},
                file: {populate: '*'},
            },
            fields: ['slug', 'duration', 'shownotes', 'publishDate', 'publishedAt'],
        },
        {encodeValuesOnly: true},
    );

    const res = await fetchJson<{data: StrapiPodcast[]}>(
        `/api/podcasts?${query}`,
        {tags: options.tags ?? ['strapi:podcast', 'strapi:podcast:list']},
    );
    return res.data ?? [];
}

export async function fetchAuthorsList(options: FetchListOptions = {}): Promise<StrapiAuthor[]> {
    'use cache'
    const limit = options.limit ?? 100;
    const query = qs.stringify(
        {
            sort: ['title:asc'],
            pagination: {pageSize: limit, page: 1},
            populate: ['avatar'],
            fields: ['slug', 'title', 'description'],
        },
        {encodeValuesOnly: true},
    );

    const res = await fetchJson<{data: StrapiAuthor[]}>(
        `/api/authors?${query}`,
        {tags: options.tags ?? ['strapi:author', 'strapi:author:list']},
    );
    return res.data ?? [];
}

export async function fetchAuthorBySlug(slug: string): Promise<StrapiAuthorWithContent | null> {
    'use cache'
    const query = qs.stringify(
        {
            filters: {slug: {$eq: slug}},
            populate: {
                avatar: true,
                articles: {populate: {base: {fields: ['title']}}, fields: ['slug', 'publishDate', 'publishedAt']},
                podcasts: {populate: {base: {fields: ['title']}}, fields: ['slug', 'publishDate', 'publishedAt']},
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

export async function fetchCategoriesWithContent(options: FetchListOptions = {}): Promise<StrapiCategoryWithContent[]> {
    'use cache'
    const limit = options.limit ?? 100;
    const query = qs.stringify(
        {
            sort: ['base.title:asc'],
            pagination: {pageSize: limit, page: 1},
            populate: {
                base: {populate: ['cover', 'banner'], fields: ['title', 'description']},
                articles: {populate: {base: {fields: ['title']}}, fields: ['slug', 'publishDate', 'publishedAt']},
                podcasts: {populate: {base: {fields: ['title']}}, fields: ['slug', 'publishDate', 'publishedAt']},
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

