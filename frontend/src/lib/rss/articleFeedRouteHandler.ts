import qs from 'qs';

import {CACHE_REVALIDATE_DEFAULT} from '@/src/lib/cache/constants';
import {
    generateArticleFeedXml,
    type StrapiArticle,
    type StrapiArticleFeedSingle,
} from '@/src/lib/rss/articlefeed';
import {createFeedCache, type FeedBuilt} from '@/src/lib/rss/feedCache';
import {fetchStrapiJson as fetchStrapiJsonCore} from '@/src/lib/rss/feedRoute';
import {sha256Hex} from '@/src/lib/rss/xml';
import {MEDIA_FIELDS, populateAuthorAvatar, populateCategory} from '@/src/lib/strapiContent';

const SITE_URL = (process.env.NEXT_PUBLIC_DOMAIN ?? 'https://m10z.de').replace(/\/+$/, '');
const STRAPI_URL = (process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? '').replace(
    /\/+$/,
    '',
);
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

// `module.hot` is injected by the dev bundler for HMR; not present in production/runtime node.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

async function fetchStrapiJson<T>(pathWithQuery: string): Promise<T> {
    if (!STRAPI_URL) throw new Error('Missing NEXT_PUBLIC_STRAPI_URL');
    const revalidate = process.env.NODE_ENV === 'production' ? CACHE_REVALIDATE_DEFAULT : 0;
    return await fetchStrapiJsonCore<T>({
        strapiBaseUrl: STRAPI_URL,
        apiPathWithQuery: pathWithQuery,
        token: STRAPI_TOKEN,
        tags: ['feed:article', 'strapi:article', 'strapi:article-feed'],
        revalidate,
        timeoutMs: 30_000,
    });
}

async function fetchArticlePage(
    page: number,
    pageSize: number,
): Promise<{
    data: unknown[];
    meta?: {pagination?: {page: number; pageCount: number; total: number}};
}> {
    const query = qs.stringify(
        {
            sort: ['publishedAt:desc'],
            status: 'published',
            pagination: {pageSize, page},
            populate: {
                cover: {fields: MEDIA_FIELDS},
                banner: {fields: MEDIA_FIELDS},
                authors: populateAuthorAvatar,
                categories: populateCategory,
            },
            fields: ['slug', 'content', 'wordCount', 'publishedAt', 'title', 'description', 'date'],
        },
        {encodeValuesOnly: true},
    );
    return fetchStrapiJson(`/api/articles?${query}`);
}

async function fetchAllArticles(): Promise<StrapiArticle[]> {
    const maxPages = 50;
    const maxItems = Number(process.env.FEED_ARTICLE_MAX_ITEMS ?? '') || 1000;
    const pageSize = 100;

    const firstRes = await fetchArticlePage(1, pageSize);
    const firstItems = Array.isArray(firstRes.data) ? (firstRes.data as StrapiArticle[]) : [];
    const all: StrapiArticle[] = firstItems.slice(0, maxItems);

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
    const results = await Promise.all(pageNumbers.map((p) => fetchArticlePage(p, pageSize)));

    for (const res of results) {
        const items = Array.isArray(res.data) ? (res.data as StrapiArticle[]) : [];
        const remaining = Math.max(0, maxItems - all.length);
        if (remaining <= 0) break;
        all.push(...items.slice(0, remaining));
    }

    return all;
}

async function fetchArticleFeedSingle(): Promise<StrapiArticleFeedSingle> {
    const query = qs.stringify(
        {
            populate: {
                channel: {
                    populate: {image: {fields: MEDIA_FIELDS}},
                },
            },
        },
        {encodeValuesOnly: true},
    );
    const res = await fetchStrapiJson<{data: StrapiArticleFeedSingle}>(
        `/api/article-feed?${query}`,
    );
    return res.data;
}

async function buildArticleFeed(): Promise<FeedBuilt> {
    const [feed, articles] = await Promise.all([fetchArticleFeedSingle(), fetchAllArticles()]);
    const {xml, etagSeed, lastModified} = generateArticleFeedXml({
        siteUrl: SITE_URL,
        channel: feed.channel,
        articles,
    });
    const etag = `"${sha256Hex(`${etagSeed}:${sha256Hex(xml)}`)}"`;
    return {xml, etag, lastModified, itemCount: articles.length};
}

const cache = createFeedCache({
    feedKey: 'article',
    diskFileName: 'rss.xml',
    fallback: {title: 'M10Z Artikel', selfPath: '/rss.xml'},
    build: buildArticleFeed,
});

export const buildArticleFeedResponse = cache.handle;
export const scheduleDebouncedRefresh = cache.scheduleDebouncedRefresh;
export const stopScheduler = cache.stopScheduler;
export const getSchedulerState = cache.getSchedulerState;

if (typeof module !== 'undefined' && module.hot) {
    module.hot.dispose(() => {
        cache.stopScheduler();
    });
}
