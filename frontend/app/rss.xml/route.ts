import {generateArticleFeedXml, type StrapiArticle, type StrapiArticleFeedSingle} from '@/src/lib/rss/articlefeed';
import {sha256Hex} from '@/src/lib/rss/xml';
import {
    buildRssHeaders,
    fallbackFeedXml,
    fetchStrapiJson as fetchStrapiJsonCore,
    formatXml,
    maybeReturn304,
} from '@/src/lib/rss/feedRoute';

const REVALIDATE_SECONDS = 86400; // heavy caching; explicit invalidation via /api/articlefeed/invalidate

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
        revalidateSeconds: REVALIDATE_SECONDS,
        tags: ['feed:article', 'strapi:article', 'strapi:article-feed'],
    });
}

async function fetchAllArticles(): Promise<StrapiArticle[]> {
    const pageSize = 100;
    let page = 1;
    const all: StrapiArticle[] = [];

    while (true) {
        const query =
            `/api/articles?sort=publishedAt:desc&pagination[pageSize]=${pageSize}&pagination[page]=${page}&populate=*`;

        const res = await fetchStrapiJson<{
            data: unknown[];
            meta?: {pagination?: {page: number; pageCount: number; total: number}};
        }>(query);

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

    return all.filter((a) => Boolean(a.publishedAt));
}

async function fetchArticleFeedSingle(): Promise<StrapiArticleFeedSingle> {
    const res = await fetchStrapiJson<{data: StrapiArticleFeedSingle}>(`/api/article-feed?populate=*`);
    return res.data;
}

async function getCachedArticleFeed() {
    'use cache';
    const [feed, articles] = await Promise.all([fetchArticleFeedSingle(), fetchAllArticles()]);
    const {xml, etagSeed, lastModified} = generateArticleFeedXml({
        siteUrl: SITE_URL,
        channel: feed.channel,
        articles,
    });
    const etag = `"${sha256Hex(etagSeed)}"`;
    return {xml, etag, lastModified};
}

export async function GET(request: Request) {
    try {
        const {xml, etag, lastModified} = await getCachedArticleFeed();
        const prettyXml = formatXml(xml);

        const headers = buildRssHeaders({etag, lastModified});
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
