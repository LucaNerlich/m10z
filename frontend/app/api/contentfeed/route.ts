import {fetchArticlesPage, fetchPodcastsPage, type PaginatedResult} from '@/src/lib/strapiContent';
import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';
import {getEffectiveDate, sortByDateDesc, toDateTimestamp} from '@/src/lib/effectiveDate';
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

type ContentFeedResponse = {
    items: FeedItem[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        pageCount: number;
    };
    hasNextPage: boolean;
};

/**
 * Server-side merged content feed API route.
 *
 * Fetches articles and podcasts from Strapi, merges them by published date,
 * and returns the requested page. This eliminates expensive client-side
 * merging and reduces data transfer.
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 10, max: 100)
 */
export async function GET(request: Request) {
    const {searchParams} = new URL(request.url);
    const page = Math.max(1, Math.floor(Number(searchParams.get('page')) || 1));
    const pageSize = Math.max(1, Math.min(100, Math.floor(Number(searchParams.get('pageSize')) || 10)));

    try {
        // Fetch articles and podcasts in parallel
        // We need to fetch enough items to potentially fill the requested page
        // Since items are merged, we fetch a larger buffer to ensure we have enough
        // after merging. A safe approach is to fetch pageSize * 2 from each source.
        const fetchSize = Math.min(pageSize * 2, 200); // Cap at 200 per source

        const [articlesResult, podcastsResult] = await Promise.all([
            fetchArticlesPage({page: 1, pageSize: fetchSize}),
            fetchPodcastsPage({page: 1, pageSize: fetchSize}),
        ]);

        const articles = articlesResult.items;
        const podcasts = podcastsResult.items;

        // Map to feed items
        const articleItems: FeedItem[] = articles.map((article) => {
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

        const podcastItems: FeedItem[] = podcasts.map((podcast) => {
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

        // Merge and sort by publishedAt descending
        const allItems = [...articleItems, ...podcastItems].sort((a, b) => {
            const ad = toDateTimestamp(a.publishedAt) ?? 0;
            const bd = toDateTimestamp(b.publishedAt) ?? 0;
            return bd - ad;
        });

        // Calculate pagination
        const total = allItems.length;
        const offset = (page - 1) * pageSize;
        const paginatedItems = allItems.slice(offset, offset + pageSize);
        const pageCount = Math.max(1, Math.ceil(total / pageSize));
        const hasNextPage = page < pageCount;

        const response: ContentFeedResponse = {
            items: paginatedItems,
            pagination: {
                page,
                pageSize,
                total,
                pageCount,
            },
            hasNextPage,
        };

        return Response.json(response, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            },
        });
    } catch (error) {
        console.error('Error fetching content feed:', error);
        return Response.json({error: 'Failed to fetch content feed'}, {status: 500});
    }
}

