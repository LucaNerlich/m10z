import {
    generateArticleFeedXml,
    type StrapiArticle,
    type StrapiArticleFeedSingle,
} from '@/src/lib/rss/articlefeed';
import {createFeedCache, type FeedBuilt} from '@/src/lib/rss/feedCache';
import {
    FEED_CHANNEL_SINGLE_QUERY,
    FEED_SITE_URL,
    computeFeedEtag,
    createFeedListQuery,
    feedListPopulate,
    fetchFeedSourceData,
} from '@/src/lib/rss/feedDefinition';
import {createFeedStrapiFetcher} from '@/src/lib/rss/feedFetcher';
import {contentTag, feedSourceTag, feedTag} from '@/src/lib/strapi/cacheTags';

// `module.hot` is injected by the dev bundler for HMR; not present in production/runtime node.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

const fetcher = createFeedStrapiFetcher([feedTag('article'), contentTag('article'), feedSourceTag('article')]);

const buildArticleListQuery = createFeedListQuery({
    populate: feedListPopulate,
    fields: ['slug', 'content', 'wordCount', 'publishedAt', 'title', 'description', 'date'],
});

async function buildArticleFeed(): Promise<FeedBuilt> {
    const {single: feed, items: articles} = await fetchFeedSourceData<StrapiArticleFeedSingle, StrapiArticle>({
        fetcher,
        singlePathWithQuery: `/api/article-feed?${FEED_CHANNEL_SINGLE_QUERY}`,
        listBasePath: '/api/articles',
        listQueryBuilder: buildArticleListQuery,
        resolveMaxItems: () => Number(process.env.FEED_ARTICLE_MAX_ITEMS ?? '') || 1000,
    });

    const {xml, etagSeed, lastModified} = generateArticleFeedXml({
        siteUrl: FEED_SITE_URL,
        channel: feed.channel,
        articles,
    });
    return {xml, etag: computeFeedEtag(etagSeed, xml), lastModified, itemCount: articles.length};
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
