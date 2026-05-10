import qs from 'qs';

import {
    generateArticleFeedXml,
    type StrapiArticle,
    type StrapiArticleFeedSingle,
} from '@/src/lib/rss/articlefeed';
import {createFeedCache, type FeedBuilt} from '@/src/lib/rss/feedCache';
import {
    createFeedStrapiFetcher,
    fetchAllPaginated,
    fetchFeedSingle,
} from '@/src/lib/rss/feedFetcher';
import {sha256Hex} from '@/src/lib/rss/xml';
import {MEDIA_FIELDS, populateAuthorAvatar, populateCategory} from '@/src/lib/strapiContent';

const SITE_URL = (process.env.NEXT_PUBLIC_DOMAIN ?? 'https://m10z.de').replace(/\/+$/, '');

// `module.hot` is injected by the dev bundler for HMR; not present in production/runtime node.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

const fetcher = createFeedStrapiFetcher(['feed:article', 'strapi:article', 'strapi:article-feed']);

function buildArticleListQuery(page: number, pageSize: number): string {
    return qs.stringify(
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
}

const ARTICLE_FEED_SINGLE_QUERY = qs.stringify(
    {
        populate: {
            channel: {
                populate: {image: {fields: MEDIA_FIELDS}},
            },
        },
    },
    {encodeValuesOnly: true},
);

async function buildArticleFeed(): Promise<FeedBuilt> {
    const [feed, articles] = await Promise.all([
        fetchFeedSingle<StrapiArticleFeedSingle>(fetcher, `/api/article-feed?${ARTICLE_FEED_SINGLE_QUERY}`),
        fetchAllPaginated<StrapiArticle>({
            fetcher,
            apiBasePath: '/api/articles',
            buildQueryString: buildArticleListQuery,
            resolveMaxItems: () => Number(process.env.FEED_ARTICLE_MAX_ITEMS ?? '') || 1000,
        }),
    ]);

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
