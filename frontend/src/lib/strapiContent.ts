import qs from 'qs';

import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL?.replace(/\/+$/, '');

if (!STRAPI_URL) {
    throw new Error('Missing NEXT_PUBLIC_STRAPI_URL');
}

type FetchOptions = {
    tags: string[];
    revalidate?: number;
};

async function fetchJson<T>(pathWithQuery: string, options: FetchOptions): Promise<T> {
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

