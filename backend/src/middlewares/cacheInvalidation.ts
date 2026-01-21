/**
 * Cache invalidation middleware for Strapi document operations.
 *
 * Invalidates Next.js caches and rebuilds search index after successful mutations.
 */

import {queueCacheInvalidation} from '../services/asyncCacheInvalidationQueue';
import {queueSearchIndexRebuild} from '../services/asyncSearchIndexQueue';

const publishTargets = new Map<string, 'articlefeed' | 'audiofeed'>([
    ['api::article.article', 'articlefeed'],
    ['api::podcast.podcast', 'audiofeed'],
]);

const updateTargets = new Map<string, 'articlefeed' | 'audiofeed' | 'about'>([
    ['api::article-feed.article-feed', 'articlefeed'],
    ['api::audio-feed.audio-feed', 'audiofeed'],
    ['api::about.about', 'about'],
]);

const searchTargets = new Set<string>([
    'api::article.article',
    'api::podcast.podcast',
    'api::author.author',
    'api::category.category',
]);

const rebuildActions = new Set<string>(['publish', 'update', 'delete', 'unpublish']);

/**
 * Invalidates Next.js caches and rebuilds the search index after a successful Strapi document mutation.
 *
 * @param context - Operation context containing `uid` (document UID), `action` (the performed action), and optional `params` (may include `strapi` instance under `params.strapi`)
 * @param next - The next middleware/operation to execute; its result is returned unchanged
 * @returns The value returned by the invoked `next` middleware
 */
export async function cacheInvalidationMiddleware(
    context: {uid: string; action: string; params?: any},
    next: () => Promise<unknown>,
): Promise<unknown> {
    // Run the core operation first; only invalidate on success.
    const result = await next();

    // Get strapi instance from context params (set by index.ts)
    const strapiInstance = context.params?.strapi;

    // Invalidate Content
    if (context.action === 'publish' && publishTargets.has(context.uid)) {
        if (strapiInstance) {
            queueCacheInvalidation(publishTargets.get(context.uid)!, strapiInstance);
        } else {
            console.warn('[cacheInvalidation] Missing strapiInstance for cache invalidation', {
                action: context.action,
                uid: context.uid,
            });
        }
    } else if (context.action === 'update' && updateTargets.has(context.uid)) {
        if (strapiInstance) {
            queueCacheInvalidation(updateTargets.get(context.uid)!, strapiInstance);
        } else {
            console.warn('[cacheInvalidation] Missing strapiInstance for cache invalidation', {
                action: context.action,
                uid: context.uid,
            });
        }
    }

    // Rebuild search index
    if (rebuildActions.has(context.action) && searchTargets.has(context.uid)) {
        if (strapiInstance) {
            queueSearchIndexRebuild(strapiInstance);
        } else {
            console.warn('[cacheInvalidation] Missing strapiInstance for search index rebuild', {
                action: context.action,
                uid: context.uid,
            });
        }
    }

    return result;
}
