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
async function collectWindow<T extends {slug: string}>(
    fetchPage: FeedPageFetcher<T>,
    first: FeedPage<T>,
    needed: number,
    tags: string[],
): Promise<{items: T[]; total: number}> {
    const total = first.pagination.total;
    // Never ask for more than the collection holds; an out-of-range page was
    // already short-circuited by the caller.
    const wanted = Math.min(needed, total);
    const items: T[] = [];
    // Offset pages are fetched in parallel, so a publish that shifts the
    // window repeats one boundary item. Dedupe by slug, like the RSS fetcher.
    const seen = new Set<string>();
    const push = (pageItems: T[]) => {
        for (const item of pageItems) {
            if (seen.has(item.slug)) continue;
            seen.add(item.slug);
            items.push(item);
        }
    };
    push(first.items);
    const pages = Math.min(
        first.pagination.pageCount,
        Math.ceil(wanted / MAX_FETCH_PAGE_SIZE),
    );
    if (pages > 1) {
        const rest = await Promise.all(
            Array.from({length: pages - 1}, (_, index) =>
                fetchPage({page: index + 2, pageSize: MAX_FETCH_PAGE_SIZE, tags}),
            ),
        );
        for (const page of rest) push(page.items);
        // Dedupe can drop a boundary item, leaving the window short of the
        // requested size. One extra page only costs a request on that race.
        if (items.length < wanted && pages < first.pagination.pageCount) {
            const extra = await fetchPage({page: pages + 1, pageSize: MAX_FETCH_PAGE_SIZE, tags});
            push(extra.items);
        }
    }
    return {items: items.slice(0, wanted), total};
}

export async function buildContentFeed(
    page: number,
    pageSize: number,
    options: ContentFeedOptions = {},
): Promise<ContentFeedResponse> {
    // Each collection's first `page * pageSize` items already contain the
    // merged top `page * pageSize`; the extra chunk was always sliced away.
    const needed = page * pageSize;

    const extraTags = options.tags ?? [];
    const articleTags = Array.from(new Set([typeTag('article'), listPageTag('article'), ...extraTags]));
    const podcastTags = Array.from(new Set([typeTag('podcast'), listPageTag('podcast'), ...extraTags]));

    const firstPageSize = Math.min(MAX_FETCH_PAGE_SIZE, needed);
    const [articlesFirst, podcastsFirst] = await Promise.all([
        fetchArticlesPage({page: 1, pageSize: firstPageSize, tags: articleTags}),
        fetchPodcastsPage({page: 1, pageSize: firstPageSize, tags: podcastTags}),
    ]);
    const articleTotal = articlesFirst.pagination.total;
    const podcastTotal = podcastsFirst.pagination.total;

    // A page past the merged collection needs no window: report it without
    // reading the rest of either collection.
    if (page > Math.ceil((articleTotal + podcastTotal) / pageSize)) {
        return paginateMergedFeed({
            items: [],
            page,
            pageSize,
            articleTotal,
            podcastTotal,
        });
    }

    const [articlesResult, podcastsResult] = await Promise.all([
        collectWindow(fetchArticlesPage, articlesFirst, needed, articleTags),
        collectWindow(fetchPodcastsPage, podcastsFirst, needed, podcastTags),
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
