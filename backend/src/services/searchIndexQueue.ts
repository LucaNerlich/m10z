import {buildAndPersistSearchIndex} from './searchIndexBuilder';
import {AsyncTaskQueue} from './asyncTaskQueue';
import {queueCacheInvalidation, type StrapiWithDb} from './cacheInvalidationQueue';

/**
 * Rebuild the search index, then queue durable search-index/sitemap invalidation.
 * Shared by the cron job and the debounced queue.
 *
 * Only a failed *build* counts as failure here — once the index is built and persisted,
 * notifying the frontend is handed off to the durable cache-invalidation queue (which has
 * its own retry/dead-letter policy), so a transient notification hiccup doesn't trigger
 * redoing the whole (expensive) rebuild.
 */
export async function rebuildAndInvalidate(strapi: StrapiWithDb, source: 'cron' | 'queue'): Promise<boolean> {
    try {
        const {metrics} = await buildAndPersistSearchIndex(strapi as any, {source});
        strapi.log.info(
            `searchIndexSummary source=${source} articles=${metrics.counts.articles} podcasts=${metrics.counts.podcasts} authors=${metrics.counts.authors} categories=${metrics.counts.categories} total=${metrics.counts.total} buildMs=${metrics.buildMs} fetchMs=${metrics.fetchMs.total} processingMs=${metrics.processingMs} payloadBytes=${metrics.payloadBytes} payloadKb=${metrics.payloadKb}`,
        );

        queueCacheInvalidation({type: 'search-index', action: 'update'}, strapi);
        queueCacheInvalidation({type: 'sitemap', action: 'update'}, strapi);
        return true;
    } catch (error) {
        strapi.log.warn(`Search index rebuild failed (source=${source}).`, error);
        return false;
    }
}

const queue = new AsyncTaskQueue<'rebuild'>({
    name: 'search-index-rebuild',
    keyOf: (item) => item,
    run: (_item, strapi) => rebuildAndInvalidate(strapi as StrapiWithDb, 'queue'),
});

export function queueSearchIndexRebuild(strapi: StrapiWithDb | undefined | null): void {
    if (!strapi) return;
    queue.enqueue('rebuild', strapi);
}
