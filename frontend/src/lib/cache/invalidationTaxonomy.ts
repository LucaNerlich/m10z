import {INVALIDATION_TARGETS} from '@/src/lib/shared/invalidation';

import {routes} from '@/src/lib/routes';
import {INVALIDATION_TAG_GROUPS} from '@/src/lib/strapi/cacheTags';

/**
 * Frontend revalidation mapping for each invalidation target.
 *
 * Target names come from `shared/invalidation/manifest.ts`. Tag strings are
 * built via `INVALIDATION_TAG_GROUPS` in `strapi/cacheTags.ts` so read and
 * write sides cannot drift.
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
} as const satisfies Record<(typeof INVALIDATION_TARGETS)[number], Revalidations>;

export type InvalidationTarget = (typeof INVALIDATION_TARGETS)[number];

export function isInvalidationTarget(value: string): value is InvalidationTarget {
    return value in INVALIDATION_TAXONOMY;
}
