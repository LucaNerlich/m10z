import {routes} from '@/src/lib/routes';
import {INVALIDATION_TAG_GROUPS} from '@/src/lib/strapi/cacheTags';

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
 *
 * Tag strings are built via `INVALIDATION_TAG_GROUPS` in `strapi/cacheTags.ts`
 * so read and write sides cannot drift.
 */

export type Revalidations = {
    readonly tags: readonly string[];
    readonly pages: readonly string[];
    readonly paths: readonly string[];
};

export const INVALIDATION_TAXONOMY = {
    article: {
        tags: INVALIDATION_TAG_GROUPS.article(),
        pages: [routes.articles, `${routes.articles}/[slug]`, routes.home],
        paths: [],
    },
    podcast: {
        tags: INVALIDATION_TAG_GROUPS.podcast(),
        pages: [routes.podcasts, `${routes.podcasts}/[slug]`, routes.home],
        paths: [],
    },
    category: {
        tags: INVALIDATION_TAG_GROUPS.category(),
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
        tags: INVALIDATION_TAG_GROUPS.author(),
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
        tags: INVALIDATION_TAG_GROUPS.about(),
        pages: [routes.about],
        paths: [],
    },
    legal: {
        tags: INVALIDATION_TAG_GROUPS.legal(),
        pages: [],
        paths: [routes.imprint, routes.privacy],
    },
    sitemap: {
        tags: INVALIDATION_TAG_GROUPS.sitemap(),
        pages: [],
        paths: ['/sitemap.xml', '/sitemap'],
    },
    'search-index': {
        tags: INVALIDATION_TAG_GROUPS.searchIndex(),
        pages: [],
        paths: [],
    },
    articlefeed: {
        tags: INVALIDATION_TAG_GROUPS.articleFeed(),
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
        tags: INVALIDATION_TAG_GROUPS.audioFeed(),
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
