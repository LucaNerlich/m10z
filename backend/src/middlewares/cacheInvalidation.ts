/**
 * Cache invalidation middleware for Strapi document operations.
 *
 * Invalidates Next.js caches after successful mutations using the shared
 * invalidation manifest (`shared/invalidation/manifest.ts`).
 */

import {DOCUMENT_INVALIDATION} from '../../../shared/invalidation/manifest';

import {queueCacheInvalidation} from '../services/asyncCacheInvalidationQueue';

export async function cacheInvalidationMiddleware(
    context: {uid: string; action: string; params?: any},
    next: () => Promise<unknown>,
): Promise<unknown> {
    const result = await next();

    const entry = DOCUMENT_INVALIDATION[context.uid];
    if (!entry) return result;

    if (!entry.actions.includes(context.action as 'publish' | 'update')) return result;

    const strapiInstance = context.params?.strapi;
    if (!strapiInstance) {
        console.warn('[cacheInvalidation] Missing strapiInstance for cache invalidation', {
            action: context.action,
            uid: context.uid,
        });
        return result;
    }

    for (const target of entry.targets) {
        queueCacheInvalidation(target, strapiInstance);
    }

    return result;
}
