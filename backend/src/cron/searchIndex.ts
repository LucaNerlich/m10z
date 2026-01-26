/**
 * Cronjob to rebuild the search index during off-peak hours.
 * Runs nightly at 3:30 AM to rebuild the complete search index.
 */

import {buildAndPersistSearchIndex} from '../services/searchIndexBuilder';
import {invalidateNext} from '../utils/invalidateNextCache';

/**
 * Rebuilds the search index and invalidates Next.js caches.
 *
 * Calls buildAndPersistSearchIndex to rebuild the complete search index from all
 * articles, podcasts, authors, and categories. After successful rebuild, invalidates
 * the search-index and sitemap caches in Next.js.
 *
 * @param strapi - The Strapi application instance used to query documents and emit logs
 */
export async function rebuildSearchIndex({strapi}: {strapi: any}): Promise<void> {
    try {
        strapi.log.info('Starting nightly search index rebuild...');

        const {metrics} = await buildAndPersistSearchIndex(strapi, {source: 'cron'});
        strapi.log.info(
            `searchIndexSummary source=cron articles=${metrics.counts.articles} podcasts=${metrics.counts.podcasts} authors=${metrics.counts.authors} categories=${metrics.counts.categories} total=${metrics.counts.total} buildMs=${metrics.buildMs} fetchMs=${metrics.fetchMs.total} processingMs=${metrics.processingMs} payloadBytes=${metrics.payloadBytes} payloadKb=${metrics.payloadKb}`,
        );

        strapi.log.info('Search index rebuild completed successfully');

        // Invalidate Next.js caches for search-index and sitemap
        try {
            await invalidateNext('search-index');
            await invalidateNext('sitemap');
            strapi.log.info('Next.js cache invalidation completed for search-index and sitemap');
        } catch (error) {
            strapi.log.warn('Error invalidating Next.js caches after search index rebuild:', error);
        }
    } catch (error) {
        strapi.log.error('Error in search index rebuild cron job:', error);
    }
}
