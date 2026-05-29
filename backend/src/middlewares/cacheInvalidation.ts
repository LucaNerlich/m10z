/**
 * Cache invalidation middleware for Strapi document operations.
 *
 * Invalidates Next.js caches after successful mutations.
 *
 * Cross-wire contract — DO NOT DRIFT.
 *
 * The `target` values below must exist as keys in the frontend's
 * `INVALIDATION_TAXONOMY` (`frontend/src/lib/cache/invalidationTaxonomy.ts`)
 * and in the `InvalidateTarget` union in
 * `backend/src/utils/invalidateNextCache.ts`. If you add a target here,
 * update those files too.
 */

import {queueCacheInvalidation} from '../services/asyncCacheInvalidationQueue';
import type {InvalidateTarget} from '../utils/invalidateNextCache';

type StrapiAction = 'publish' | 'update';

/**
 * Map a Strapi document UID → which frontend invalidation target(s) to fire,
 * and on which actions. A single config replaces the previous separate
 * publish/update maps.
 */
export const UID_TO_TARGETS: Record<string, {actions: StrapiAction[]; target: InvalidateTarget}> = {
    'api::article.article': {actions: ['publish'], target: 'articlefeed'},
    'api::podcast.podcast': {actions: ['publish'], target: 'audiofeed'},
    'api::article-feed.article-feed': {actions: ['update'], target: 'articlefeed'},
    'api::audio-feed.audio-feed': {actions: ['update'], target: 'audiofeed'},
    'api::about.about': {actions: ['update'], target: 'about'},
};

export async function cacheInvalidationMiddleware(
    context: {uid: string; action: string; params?: any},
    next: () => Promise<unknown>,
): Promise<unknown> {
    const result = await next();

    const entry = UID_TO_TARGETS[context.uid];
    if (!entry) return result;

    if (!entry.actions.includes(context.action as StrapiAction)) return result;

    const strapiInstance = context.params?.strapi;
    if (!strapiInstance) {
        console.warn('[cacheInvalidation] Missing strapiInstance for cache invalidation', {
            action: context.action,
            uid: context.uid,
        });
        return result;
    }

    queueCacheInvalidation(entry.target, strapiInstance);
    return result;
}
