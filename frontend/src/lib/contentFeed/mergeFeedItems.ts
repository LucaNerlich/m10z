import type {StrapiMedia} from '@/src/lib/strapi/media';
import {getEffectiveDate, toDateTimestamp} from '@/src/lib/effectiveDate';
import type {StrapiArticle} from '@/src/lib/strapi/contentTypes';
import type {StrapiPodcast} from '@/src/lib/strapi/contentTypes';
import {getOptimalMediaFormat, pickBannerMedia, pickCoverMedia} from '@/src/lib/strapi/media';

export type FeedItem =
    | {
          type: 'article';
          slug: string;
          title: string;
          description?: string | null;
          publishedAt?: string | null;
          cover?: StrapiMedia;
          banner?: StrapiMedia;
          wordCount?: number | null;
          href: string;
      }
    | {
          type: 'podcast';
          slug: string;
          title: string;
          description?: string | null;
          publishedAt?: string | null;
          cover?: StrapiMedia;
          banner?: StrapiMedia;
          wordCount?: number | null;
          duration?: number | null;
          href: string;
      };

export type ContentFeedPagination = {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
};

export type ContentFeedResponse = {
    items: FeedItem[];
    pagination: ContentFeedPagination;
    hasNextPage: boolean;
};

export function clampContentFeedPage(page: number): number {
    return Math.max(1, Math.floor(page || 1));
}

export function clampContentFeedPageSize(pageSize: number): number {
    return Math.max(1, Math.min(100, Math.floor(pageSize || 10)));
}

export function computeContentFeedFetchSize(page: number, pageSize: number): number {
    const itemsNeeded = page * pageSize;
    return Math.min(itemsNeeded + 5, 200);
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

    return [...articleItems, ...podcastItems].sort((a, b) => {
        const ad = toDateTimestamp(a.publishedAt) ?? 0;
        const bd = toDateTimestamp(b.publishedAt) ?? 0;
        return bd - ad;
    });
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
