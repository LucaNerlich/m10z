import {generateArticleFeedXml} from '@/src/lib/rss/articlefeed';
import {
    FEED_CHANNEL_SINGLE_QUERY,
    FEED_SITE_URL,
    computeFeedEtag,
    createFeedListQuery,
    feedListPopulate,
    fetchFeedSourceData,
} from '@/src/lib/rss/feedDefinition';
import {createFeedStrapiFetcher} from '@/src/lib/rss/feedFetcher';
import {type FeedBuilt} from '@/src/lib/rss/feedCache';
import {type StrapiArticle, type StrapiArticleFeedSingle} from '@/src/lib/strapi/contentTypes';
import {contentTag, feedSourceTag, feedTag} from '@/src/lib/strapi/cacheTags';

const fetcher = createFeedStrapiFetcher([feedTag('article'), contentTag('article'), feedSourceTag('article')]);

const buildArticleListQuery = createFeedListQuery({
    populate: feedListPopulate,
    fields: ['slug', 'content', 'wordCount', 'publishedAt', 'title', 'description', 'date'],
});

/** Build the article RSS feed document (fetch → generate → etag). */
export async function buildArticleFeed(): Promise<FeedBuilt> {
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
