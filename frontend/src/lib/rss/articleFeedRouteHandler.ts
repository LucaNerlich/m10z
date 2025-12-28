import qs from 'qs';

import {generateArticleFeedXml, type StrapiArticle, type StrapiArticleFeedSingle} from '@/src/lib/rss/articlefeed';
import {sha256Hex} from '@/src/lib/rss/xml';
import {
    buildRssHeaders,
    fallbackFeedXml,
    fetchStrapiJson as fetchStrapiJsonCore,
    formatXml,
    maybeReturn304,
} from '@/src/lib/rss/feedRoute';

const SITE_URL = (process.env.NEXT_PUBLIC_DOMAIN ?? 'https://m10z.de').replace(/\/+$/, '');
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL
    ? process.env.NEXT_PUBLIC_STRAPI_URL.replace(/\/+$/, '')
    : '';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

async function fetchStrapiJson<T>(pathWithQuery: string): Promise<T> {
    if (!STRAPI_URL) throw new Error('Missing NEXT_PUBLIC_STRAPI_URL');
    return await fetchStrapiJsonCore<T>({
        strapiBaseUrl: STRAPI_URL,
        apiPathWithQuery: pathWithQuery,
        token: STRAPI_TOKEN,
        tags: ['feed:article', 'strapi:article', 'strapi:article-feed'],
    });
}

async function fetchAllArticles(): Promise<StrapiArticle[]> {
    const pageSize = 100;
    let page = 1;
    const all: StrapiArticle[] = [];
    while (true) {
        const query = qs.stringify(
            {
                sort: ['publishedAt:desc'],
                status: 'published',
                pagination: {pageSize, page},
                populate: {
                    base: {
                        populate: ['cover', 'banner'],
                        fields: ['title', 'description', 'date'],
                    },
                    authors: {
                        populate: ['avatar'],
                        fields: ['title', 'slug', 'description'],
                    },
                    categories: {
                        populate: {
                            base: {
                                populate: ['cover', 'banner'],
                                fields: ['title', 'description'],
                            },
                        },
                        fields: ['slug'],
                    },
                },
                fields: ['slug', 'content', 'publishedAt'],
            },
            {encodeValuesOnly: true},
        );

        const res = await fetchStrapiJson<{
            data: unknown[];
            meta?: {pagination?: {page: number; pageCount: number; total: number}};
        }>(`/api/articles?${query}`);

        const items = Array.isArray(res.data) ? (res.data as StrapiArticle[]) : [];
        all.push(...items);

        const pagination = res.meta?.pagination;
        const done =
            !pagination ||
            pagination.page >= pagination.pageCount ||
            items.length === 0;
        if (done) break;
        page++;
    }

    return all;
}

async function fetchArticleFeedSingle(): Promise<StrapiArticleFeedSingle> {
    const query = qs.stringify(
        {
            populate: {
                channel: {
                    populate: ['image'],
                },
            },
        },
        {encodeValuesOnly: true},
    );
    const res = await fetchStrapiJson<{data: StrapiArticleFeedSingle}>(`/api/article-feed?${query}`);
    return res.data;
}

async function getCachedArticleFeed() {
    const [feed, articles] = await Promise.all([fetchArticleFeedSingle(), fetchAllArticles()]);
    const {xml, etagSeed, lastModified} = generateArticleFeedXml({
        siteUrl: SITE_URL,
        strapiUrl: STRAPI_URL,
        channel: feed.channel,
        articles,
    });
    // Use the full XML content to derive the ETag so content-only changes invalidate caches.
    const etag = `"${sha256Hex(`${etagSeed}:${sha256Hex(xml)}`)}"`;
    return {xml, etag, lastModified};
}

export async function buildArticleFeedResponse(request: Request): Promise<Response> {
    try {
        const {xml, etag, lastModified} = await getCachedArticleFeed();
        const prettyXml = formatXml(xml);

        // Encourage clients to revalidate on every request; server-side fetch remains cached by tags.
        const headers = buildRssHeaders({
            etag,
            lastModified,
        });
        const maybe304 = maybeReturn304(request, etag, headers);
        if (maybe304) return maybe304;

        return new Response(prettyXml, {headers});
    } catch {
        const fallback = fallbackFeedXml({
            title: 'M10Z Artikel',
            link: SITE_URL,
            selfLink: `${SITE_URL}/rss.xml`,
            description: 'Feed temporarily unavailable',
        });

        return new Response(formatXml(fallback), {
            status: 503,
            headers: buildRssHeaders({}),
        });
    }
}

