import {generateArticleFeedXml} from '@/src/lib/rss/articlefeed';
import {
    computeFeedEtag,
    FEED_CHANNEL_SINGLE_QUERY,
    FEED_SITE_URL,
    feedListPopulate,
    fetchFeedSourceData,
} from '@/src/lib/rss/feedDefinition';
import {createPrivilegedFeedReader} from '@/src/lib/strapi/contentAccess';
import {buildFeedListQuery} from '@/src/lib/strapi-queries/queries';
import {type FeedBuilt} from '@/src/lib/rss/feedCache';
import {type StrapiArticle, type StrapiArticleFeedSingle} from '@/src/lib/strapi/contentTypes';
import {feedSourceTag, feedTag, typeTag} from '@/src/lib/shared/contracts/strapi-contract/tags';
const fetcher = createPrivilegedFeedReader([feedTag('article'), typeTag('article'), feedSourceTag('article')]);

const buildArticleListQuery = buildFeedListQuery({
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
