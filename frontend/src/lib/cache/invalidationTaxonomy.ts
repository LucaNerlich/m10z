import {routes} from '@/src/lib/routes';
import {
    HOME_PAGE_TAG,
    RELATED_CONTENT_TAG,
    SEARCH_INDEX_TAG,
    contentListTag,
    contentTag,
    feedSourceTag,
    feedTag,
    sitemapTag,
} from '@/src/lib/cache/strapiTags';

/**
 * Cross-wire contract — DO NOT DRIFT.
 *
 * The backend (Strapi) POSTs to `/api/{target}/invalidate` where `{target}` is
 * one of the keys below. If you add a key here, you must also:
 *
 *   1. Add the same string to `backend/src/utils/invalidateNextCache.ts`
 *      (the `InvalidateTarget` union there).
 *   2. Wire the Strapi UID → target mapping in
 *      `backend/src/middlewares/cacheInvalidation.ts`.
 *
 * `InvalidationTarget` is *derived* from this object's keys — the runtime
 * record is the single source of truth on the frontend side.
 */

export type Revalidations = {
    readonly tags: readonly string[];
    readonly pages: readonly string[];
    readonly paths: readonly string[];
};

export const INVALIDATION_TAXONOMY = {
    article: {
        tags: [contentTag('article'), contentListTag('article'), RELATED_CONTENT_TAG, HOME_PAGE_TAG],
        pages: [routes.articles, `${routes.articles}/[slug]`, routes.home],
        paths: [],
    },
    podcast: {
        tags: [contentTag('podcast'), contentListTag('podcast'), RELATED_CONTENT_TAG, HOME_PAGE_TAG],
        pages: [routes.podcasts, `${routes.podcasts}/[slug]`, routes.home],
        paths: [],
    },
    category: {
        tags: [
            contentTag('category'),
            contentListTag('category'),
            contentTag('article'),
            contentListTag('article'),
            contentTag('podcast'),
            contentListTag('podcast'),
        ],
        pages: [
            routes.categories,
            `${routes.categories}/[slug]`,
            routes.articles,
            routes.podcasts,
            routes.home,
        ],
        paths: [],
    },
    author: {
        tags: [
            contentTag('author'),
            contentListTag('author'),
            contentTag('article'),
            contentListTag('article'),
            contentTag('podcast'),
            contentListTag('podcast'),
        ],
        pages: [
            routes.articles,
            `${routes.articles}/[slug]`,
            routes.podcasts,
            `${routes.podcasts}/[slug]`,
            `${routes.authors}/[slug]`,
            routes.home,
        ],
        paths: [],
    },
    about: {
        tags: ['about', 'strapi:about'],
        pages: [routes.about],
        paths: [],
    },
    legal: {
        tags: ['legal', 'imprint', 'privacy'],
        pages: [],
        paths: [routes.imprint, routes.privacy],
    },
    sitemap: {
        tags: [
            sitemapTag('articles'),
            sitemapTag('podcasts'),
            sitemapTag('authors'),
            sitemapTag('categories'),
        ],
        pages: [],
        paths: ['/sitemap.xml', '/sitemap'],
    },
    'search-index': {
        tags: [SEARCH_INDEX_TAG],
        pages: [],
        paths: [],
    },
    articlefeed: {
        tags: [
            feedTag('article'),
            feedSourceTag('article'),
            contentTag('article'),
            contentListTag('article'),
            RELATED_CONTENT_TAG,
            contentTag('category'),
            contentListTag('category'),
            HOME_PAGE_TAG,
        ],
        pages: [
            routes.home,
            routes.articles,
            `${routes.articles}/[slug]`,
            routes.categories,
            `${routes.categories}/[slug]`,
        ],
        paths: [routes.articleFeed],
    },
    audiofeed: {
        tags: [
            feedTag('audio'),
            feedSourceTag('audio'),
            contentTag('podcast'),
            contentListTag('podcast'),
            RELATED_CONTENT_TAG,
            contentTag('category'),
            contentListTag('category'),
            HOME_PAGE_TAG,
        ],
        pages: [
            routes.home,
            routes.podcasts,
            `${routes.podcasts}/[slug]`,
            routes.categories,
            `${routes.categories}/[slug]`,
        ],
        paths: [routes.audioFeed],
    },
} as const satisfies Record<string, Revalidations>;

export type InvalidationTarget = keyof typeof INVALIDATION_TAXONOMY;

export function isInvalidationTarget(value: string): value is InvalidationTarget {
    return value in INVALIDATION_TAXONOMY;
}
