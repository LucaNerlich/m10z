import {buildAndPersistSearchIndex} from './searchIndexBuilder';
import {postInvalidationEvent} from '../utils/invalidateNextCache';
import {AsyncTaskQueue, type StrapiLike} from './asyncTaskQueue';

/** Rebuild the search index, then invalidate the search-index and sitemap caches. Shared by the cron job and the debounced queue. */
export async function rebuildAndInvalidate(strapi: StrapiLike, source: 'cron' | 'queue'): Promise<boolean> {
    try {
        const {metrics} = await buildAndPersistSearchIndex(strapi as any, {source});
        strapi.log.info(
            `searchIndexSummary source=${source} articles=${metrics.counts.articles} podcasts=${metrics.counts.podcasts} authors=${metrics.counts.authors} categories=${metrics.counts.categories} total=${metrics.counts.total} buildMs=${metrics.buildMs} fetchMs=${metrics.fetchMs.total} processingMs=${metrics.processingMs} payloadBytes=${metrics.payloadBytes} payloadKb=${metrics.payloadKb}`,
        );

        const [searchIndexOk, sitemapOk] = await Promise.all([
            postInvalidationEvent({type: 'search-index', action: 'update'}, strapi.log),
            postInvalidationEvent({type: 'sitemap', action: 'update'}, strapi.log),
        ]);
        return searchIndexOk && sitemapOk;
    } catch (error) {
        strapi.log.warn(`Search index rebuild failed (source=${source}).`, error);
        return false;
    }
}

const queue = new AsyncTaskQueue<'rebuild'>({
    name: 'search-index-rebuild',
    keyOf: (item) => item,
    run: (_item, strapi) => rebuildAndInvalidate(strapi, 'queue'),
});

export function queueSearchIndexRebuild(strapi: StrapiLike | undefined | null): void {
    if (!strapi) return;
    queue.enqueue('rebuild', strapi);
}
