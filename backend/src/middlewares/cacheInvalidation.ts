/**
 * Cache invalidation middleware for Strapi document operations.
 *
 * Invalidates Next.js caches and rebuilds search index after successful mutations.
 */

import {invalidateNext} from '../utils/invalidateNextCache';
import {buildAndPersistSearchIndex} from '../services/searchIndexBuilder';

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
        await invalidateNext(publishTargets.get(context.uid)!);
    } else if (context.action === 'update' && updateTargets.has(context.uid)) {
        await invalidateNext(updateTargets.get(context.uid)!);
    }

    // Rebuild search index
    if (rebuildActions.has(context.action) && searchTargets.has(context.uid)) {
        try {
            if (strapiInstance) {
                await buildAndPersistSearchIndex(strapiInstance);
                await invalidateNext('search-index');

                // Invalidate Sitemap
                await invalidateNext('sitemap');
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Failed to rebuild search index', err);
        }
    }

    return result;
}
