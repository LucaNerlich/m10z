import {fetchArticlesPage, fetchPodcastsPage} from '@/src/lib/strapiContent';
import {listPageTag, typeTag} from '@/src/lib/shared/contracts/strapi-contract/tags';
import {
    type ContentFeedResponse,
    mergeFeedItems,
    paginateMergedFeed,
} from '@/src/lib/contentFeed/mergeFeedItems';

export type {ContentFeedResponse} from '@/src/lib/contentFeed/mergeFeedItems';

export interface ContentFeedOptions {
    tags?: string[];
}

/** Strapi's REST `maxLimit`; a larger pageSize is silently clamped. */
const MAX_FETCH_PAGE_SIZE = 100;

type FeedPage<T> = {
    items: T[];
    pagination: {total: number; pageCount: number};
};

type FeedPageFetcher<T> = (args: {
    page: number;
    pageSize: number;
    tags: string[];
}) => Promise<FeedPage<T>>;

/**
 * Fetch enough 100-item pages of one collection to cover `needed` items.
 * The backend cannot return more than 100 per request, so a deep page needs
 * more than one request instead of silently truncating the feed window.
 */
async function fetchWindow<T>(
    fetchPage: FeedPageFetcher<T>,
    needed: number,
    tags: string[],
): Promise<{items: T[]; total: number}> {
    const first = await fetchPage({page: 1, pageSize: MAX_FETCH_PAGE_SIZE, tags});
    const items = [...first.items];
    const pages = Math.min(
        first.pagination.pageCount,
        Math.ceil(needed / MAX_FETCH_PAGE_SIZE),
    );
    if (pages > 1) {
        const rest = await Promise.all(
            Array.from({length: pages - 1}, (_, index) =>
                fetchPage({page: index + 2, pageSize: MAX_FETCH_PAGE_SIZE, tags}),
            ),
        );
        for (const page of rest) items.push(...page.items);
    }
    return {items: items.slice(0, needed), total: first.pagination.total};
}

export async function buildContentFeed(
    page: number,
    pageSize: number,
    options: ContentFeedOptions = {},
): Promise<ContentFeedResponse> {
    // Over-fetch by five items so the merge can fill the requested page even
    // when one collection is slightly ahead of the other.
    const needed = page * pageSize + 5;

    const extraTags = options.tags ?? [];
    const articleTags = Array.from(new Set([typeTag('article'), listPageTag('article'), ...extraTags]));
    const podcastTags = Array.from(new Set([typeTag('podcast'), listPageTag('podcast'), ...extraTags]));

    const [articlesResult, podcastsResult] = await Promise.all([
        fetchWindow(fetchArticlesPage, needed, articleTags),
        fetchWindow(fetchPodcastsPage, needed, podcastTags),
    ]);

    const merged = mergeFeedItems(articlesResult.items, podcastsResult.items);

    return paginateMergedFeed({
        items: merged,
        page,
        pageSize,
        articleTotal: articlesResult.total,
        podcastTotal: podcastsResult.total,
    });
}
