/**
 * Cache invalidation middleware for Strapi document operations.
 *
 * Invalidates Next.js caches and rebuilds search index after successful mutations.
 * Uses batching to reduce invalidation calls when multiple operations occur in quick succession.
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

// Batch invalidation state
let pendingInvalidations = new Set<string>();
let pendingSearchIndexRebuild: {strapi: any} | null = null;
let invalidationTimer: NodeJS.Timeout | null = null;
const BATCH_DELAY_MS = 5000; // Wait 5 seconds to batch invalidations (allows cron job batch to complete)

/**
 * Execute pending invalidations and reset batch state.
 */
async function flushInvalidations(): Promise<void> {
    if (invalidationTimer) {
        clearTimeout(invalidationTimer);
        invalidationTimer = null;
    }

    const targetsToInvalidate = Array.from(pendingInvalidations);
    const searchIndexRebuild = pendingSearchIndexRebuild;

    // Reset state before async operations
    pendingInvalidations = new Set();
    pendingSearchIndexRebuild = null;

    // Rebuild search index if needed (only once per batch)
    if (searchIndexRebuild) {
        try {
            await buildAndPersistSearchIndex(searchIndexRebuild.strapi);
            targetsToInvalidate.push('search-index');
            targetsToInvalidate.push('sitemap');
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Failed to rebuild search index in batch:', err);
        }
    }

    // Execute invalidations sequentially with a small delay between each to avoid rate limits
    // Rate limit is 30/min, so we can do ~1 per 2 seconds safely
    for (const target of targetsToInvalidate) {
        try {
            await invalidateNext(target as any);
            // Small delay between invalidations to stay under rate limit
            if (targetsToInvalidate.length > 1) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn(`Failed to invalidate ${target}:`, err);
        }
    }
}

/**
 * Schedule invalidation to be batched.
 */
function scheduleInvalidation(target: string): void {
    pendingInvalidations.add(target);

    // Clear existing timer
    if (invalidationTimer) {
        clearTimeout(invalidationTimer);
    }

    // Schedule flush after delay
    invalidationTimer = setTimeout(() => {
        flushInvalidations().catch((err) => {
            // eslint-disable-next-line no-console
            console.warn('Error flushing batched invalidations:', err);
        });
    }, BATCH_DELAY_MS);
}

/**
 * Schedule search index rebuild to be batched.
 */
function scheduleSearchIndexRebuild(strapi: any): void {
    // Only schedule if not already pending
    if (!pendingSearchIndexRebuild) {
        pendingSearchIndexRebuild = {strapi};
    }

    // Clear existing timer
    if (invalidationTimer) {
        clearTimeout(invalidationTimer);
    }

    // Schedule flush after delay
    invalidationTimer = setTimeout(() => {
        flushInvalidations().catch((err) => {
            // eslint-disable-next-line no-console
            console.warn('Error flushing batched invalidations:', err);
        });
    }, BATCH_DELAY_MS);
}

/**
 * Invalidates Next.js caches and rebuilds the search index after a successful Strapi document mutation.
 *
 * Uses batching to reduce invalidation calls when multiple operations occur in quick succession
 * (e.g., when publishing multiple items in a cron job). Invalidations are batched with a 5-second
 * delay, so multiple publishes within 5 seconds will result in a single set of invalidation calls.
 * Invalidations are executed sequentially with small delays to stay under the rate limit (30/min).
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

    // Collect invalidation targets for batching
    const invalidationTargets: string[] = [];

    // Invalidate Content
    if (context.action === 'publish' && publishTargets.has(context.uid)) {
        invalidationTargets.push(publishTargets.get(context.uid)!);
    } else if (context.action === 'update' && updateTargets.has(context.uid)) {
        invalidationTargets.push(updateTargets.get(context.uid)!);
    }

    // Schedule search index rebuild (batched - only rebuilds once even if multiple items published)
    if (rebuildActions.has(context.action) && searchTargets.has(context.uid)) {
        if (strapiInstance) {
            scheduleSearchIndexRebuild(strapiInstance);
        }
    }

    // Schedule batched invalidations
    for (const target of invalidationTargets) {
        scheduleInvalidation(target);
    }

    return result;
}
