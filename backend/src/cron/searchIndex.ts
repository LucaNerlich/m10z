/**
 * Cronjob to rebuild the search index during off-peak hours.
 * Runs nightly at 3:30 AM to rebuild the complete search index.
 */

import {rebuildAndInvalidate, type RebuildStrapi} from '../services/searchIndexQueue';

/**
 * Rebuilds the search index and invalidates Next.js caches.
 *
 * @param strapi - The Strapi application instance used to query documents and emit logs
 */
export async function rebuildSearchIndex({strapi}: {strapi: RebuildStrapi}): Promise<void> {
    strapi.log.info('Starting nightly search index rebuild...');
    await rebuildAndInvalidate(strapi, 'cron');
}
