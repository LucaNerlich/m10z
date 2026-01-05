import {fetchArticlesPage, fetchPodcastsPage} from '@/src/lib/strapiContent';
import {getEffectiveDate, toDateTimestamp} from '@/src/lib/effectiveDate';
import {getOptimalMediaFormat, pickBannerMedia, pickCoverMedia} from '@/src/lib/rss/media';

type FeedItem =
    | {
          type: 'article';
          slug: string;
          title: string;
          description?: string | null;
          publishedAt?: string | null;
          cover?: any;
          banner?: any;
          wordCount?: number | null;
          href: string;
      }
    | {
          type: 'podcast';
          slug: string;
          title: string;
          description?: string | null;
          publishedAt?: string | null;
          cover?: any;
          banner?: any;
          wordCount?: number | null;
          duration?: number | null;
          href: string;
      };

export type ContentFeedResponse = {
    items: FeedItem[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        pageCount: number;
    };
    hasNextPage: boolean;
};

export interface ContentFeedOptions {
    tags?: string[];
}

/**
 * Builds a paginated combined feed of articles and podcasts, optionally filtered by tags.
 *
 * Normalizes and clamps `page` and `pageSize`, fetches a buffered set of articles and podcasts,
 * merges and sorts them by published date, and returns the slice corresponding to the requested page.
 *
 * @param page - 1-based page index (values less than 1 are treated as 1)
 * @param pageSize - number of items per page (clamped to the range 1–100)
 * @param options - optional feed options; `options.tags` can include additional tags to filter the fetched content
 * @returns The paginated feed response containing `items`, `pagination` (page, pageSize, total, pageCount), and `hasNextPage`
 */
export async function buildContentFeed(
    page: number,
    pageSize: number,
    options: ContentFeedOptions = {},
): Promise<ContentFeedResponse> {
    const safePage = Math.max(1, Math.floor(page || 1));
    const safePageSize = Math.max(1, Math.min(100, Math.floor(pageSize || 10)));

    // We need to fetch enough items to potentially fill the requested page
    // Since items are merged, we fetch a larger buffer to ensure we have enough after merging.
    const fetchSize = Math.min(safePageSize * 2, 200);

    const extraTags = options.tags ?? [];
    const articleTags = Array.from(new Set(['strapi:article', 'strapi:article:list:page', ...extraTags]));
    const podcastTags = Array.from(new Set(['strapi:podcast', 'strapi:podcast:list:page', ...extraTags]));

    const [articlesResult, podcastsResult] = await Promise.all([
        fetchArticlesPage({page: 1, pageSize: fetchSize, tags: articleTags}),
        fetchPodcastsPage({page: 1, pageSize: fetchSize, tags: podcastTags}),
    ]);

    const articleItems: FeedItem[] = articlesResult.items.map((article) => {
        const effectiveDescription = article.base.description || article.categories?.[0]?.base?.description;
        return {
            type: 'article',
            slug: article.slug,
            title: article.base.title,
            description: effectiveDescription,
            publishedAt: getEffectiveDate(article),
            cover: getOptimalMediaFormat(pickCoverMedia(article.base, article.categories), 'medium'),
            banner: getOptimalMediaFormat(pickBannerMedia(article.base, article.categories), 'medium'),
            wordCount: article.wordCount ?? null,
            href: `/artikel/${article.slug}`,
        };
    });

    const podcastItems: FeedItem[] = podcastsResult.items.map((podcast) => {
        const effectiveDescription = podcast.base.description || podcast.categories?.[0]?.base?.description;
        return {
            type: 'podcast',
            slug: podcast.slug,
            title: podcast.base.title,
            description: effectiveDescription,
            publishedAt: getEffectiveDate(podcast),
            cover: getOptimalMediaFormat(pickCoverMedia(podcast.base, podcast.categories), 'medium'),
            banner: getOptimalMediaFormat(pickBannerMedia(podcast.base, podcast.categories), 'medium'),
            wordCount: podcast.wordCount ?? null,
            duration: podcast.duration ?? null,
            href: `/podcasts/${podcast.slug}`,
        };
    });

    const allItems = [...articleItems, ...podcastItems].sort((a, b) => {
        const ad = toDateTimestamp(a.publishedAt) ?? 0;
        const bd = toDateTimestamp(b.publishedAt) ?? 0;
        return bd - ad;
    });

    const total = allItems.length;
    const offset = (safePage - 1) * safePageSize;
    const paginatedItems = allItems.slice(offset, offset + safePageSize);
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

