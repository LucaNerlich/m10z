import type {StrapiMedia} from '@/src/lib/strapi/media';
import {getOptimalMediaFormat, pickBannerMedia, pickCoverMedia} from '@/src/lib/strapi/media';
import {getEffectiveDate, sortByDateDesc} from '@/src/lib/effectiveDate';
import type {PaginatedResult} from '@/src/lib/strapi/responses';
import type {StrapiArticle, StrapiPodcast} from '@/src/lib/strapi/contentTypes';

type FeedItemBase = {
    slug: string;
    title: string;
    description?: string | null;
    publishedAt?: string | null;
    cover?: StrapiMedia;
    banner?: StrapiMedia;
    wordCount?: number | null;
    href: string;
};

export type FeedItem =
    | (FeedItemBase & {type: 'article'})
    | (FeedItemBase & {type: 'podcast'; duration?: number | null});

/** The merged article+podcast feed reuses the canonical paginated-result envelope. */
export type ContentFeedResponse = PaginatedResult<FeedItem>;

export function clampContentFeedPage(page: number): number {
    // Infinity survives Math.max/Math.floor and then serializes as null — non-finite input falls back to 1.
    return Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
}

export function clampContentFeedPageSize(pageSize: number): number {
    return Math.max(1, Math.min(100, Math.floor(pageSize || 10)));
}

function mapArticleToFeedItem(article: StrapiArticle): FeedItem {
    const effectiveDescription = article.description || article.categories?.[0]?.description;
    return {
        type: 'article',
        slug: article.slug,
        title: article.title,
        description: effectiveDescription,
        publishedAt: getEffectiveDate(article),
        cover: getOptimalMediaFormat(pickCoverMedia(article, article.categories), 'medium'),
        banner: getOptimalMediaFormat(pickBannerMedia(article, article.categories), 'medium'),
        wordCount: article.wordCount ?? null,
        href: `/artikel/${article.slug}`,
    };
}

function mapPodcastToFeedItem(podcast: StrapiPodcast): FeedItem {
    const effectiveDescription = podcast.description || podcast.categories?.[0]?.description;
    return {
        type: 'podcast',
        slug: podcast.slug,
        title: podcast.title,
        description: effectiveDescription,
        publishedAt: getEffectiveDate(podcast),
        cover: getOptimalMediaFormat(pickCoverMedia(podcast, podcast.categories), 'medium'),
        banner: getOptimalMediaFormat(pickBannerMedia(podcast, podcast.categories), 'medium'),
        wordCount: podcast.wordCount ?? null,
        duration: podcast.duration ?? null,
        href: `/podcasts/${podcast.slug}`,
    };
}

export function mergeFeedItems(articles: StrapiArticle[], podcasts: StrapiPodcast[]): FeedItem[] {
    const articleItems = articles.map(mapArticleToFeedItem);
    const podcastItems = podcasts.map(mapPodcastToFeedItem);

    return sortByDateDesc([...articleItems, ...podcastItems]);
}

export function paginateMergedFeed(args: {
    items: FeedItem[];
    page: number;
    pageSize: number;
    articleTotal: number;
    podcastTotal: number;
}): ContentFeedResponse {
    const safePage = clampContentFeedPage(args.page);
    const safePageSize = clampContentFeedPageSize(args.pageSize);
    const total = args.articleTotal + args.podcastTotal;
    const offset = (safePage - 1) * safePageSize;
    const paginatedItems = args.items.slice(offset, offset + safePageSize);
    // The fetcher loads every 100-item chunk the requested page needs, so the
    // merged window covers the whole collection; pageCount describes the real
    // collection, not the size of a single capped fetch.
    const pageCount = Math.max(1, Math.ceil(total / safePageSize));
    const hasNextPage = safePage < pageCount;

    return {
        items: paginatedItems,
        pagination: {
            page: safePage,
            pageSize: safePageSize,
            total,
            pageCount,
        },
        hasNextPage,
    };
}
