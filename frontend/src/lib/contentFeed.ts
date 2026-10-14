import {fetchArticlesPage, fetchPodcastsPage} from '@/src/lib/strapiContent';
import {listPageTag, typeTag} from '@/src/lib/shared/contracts/strapi-contract/tags';
import {
    computeContentFeedFetchSize,
    type ContentFeedResponse,
    mergeFeedItems,
    paginateMergedFeed,
} from '@/src/lib/contentFeed/mergeFeedItems';

export type {ContentFeedResponse} from '@/src/lib/contentFeed/mergeFeedItems';

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
    const articleTags = Array.from(new Set([typeTag('article'), listPageTag('article'), ...extraTags]));
    const podcastTags = Array.from(new Set([typeTag('podcast'), listPageTag('podcast'), ...extraTags]));

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
