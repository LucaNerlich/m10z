import {fetchArticlesPage, fetchPodcastsPage} from '@/src/lib/strapiContent';
import {contentListPageTag, contentTag} from '@/src/lib/strapi/cacheTags';
import {
    computeContentFeedFetchSize,
    type ContentFeedResponse,
    mergeFeedItems,
    paginateMergedFeed,
} from '@/src/lib/contentFeed/mergeFeedItems';

export type {ContentFeedResponse, FeedItem} from '@/src/lib/contentFeed/mergeFeedItems';

export interface ContentFeedOptions {
    tags?: string[];
}

export async function buildContentFeed(
    page: number,
    pageSize: number,
    options: ContentFeedOptions = {},
): Promise<ContentFeedResponse> {
    const fetchSize = computeContentFeedFetchSize(page, pageSize);

    const extraTags = options.tags ?? [];
    const articleTags = Array.from(new Set([contentTag('article'), contentListPageTag('article'), ...extraTags]));
    const podcastTags = Array.from(new Set([contentTag('podcast'), contentListPageTag('podcast'), ...extraTags]));

    const [articlesResult, podcastsResult] = await Promise.all([
        fetchArticlesPage({page: 1, pageSize: fetchSize, tags: articleTags}),
        fetchPodcastsPage({page: 1, pageSize: fetchSize, tags: podcastTags}),
    ]);

    const merged = mergeFeedItems(articlesResult.items, podcastsResult.items);

    return paginateMergedFeed({
        items: merged,
        page,
        pageSize,
        articleTotal: articlesResult.pagination.total,
        podcastTotal: podcastsResult.pagination.total,
    });
}
