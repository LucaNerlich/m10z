import type {InvalidationEvent} from '../shared/contracts/strapi-contract/invalidationEvent';

import {AsyncTaskQueue, type StrapiLike} from './asyncTaskQueue';
import {postInvalidationEvent} from '../utils/invalidateNextCache';
import {drainPending, persistPending, removePending, type StrapiDb} from './pendingInvalidationStore';

/** Everything the cache-invalidation queue needs from the Strapi global: logging plus DB access. */
export type StrapiWithDb = StrapiLike & StrapiDb;

type QueueItem = {event: InvalidationEvent; dbIds: number[]};

function keyOf(item: QueueItem): string {
    const {type, action, slug} = item.event;
    return `${type}:${action}:${slug ?? ''}`;
}

const queue = new AsyncTaskQueue<QueueItem, StrapiWithDb>({
    name: 'cache-invalidation',
    keyOf,
    // Repeated events for the same key within the debounce window coalesce into one
    // delivery — but each was persisted as its own row, so every dbId must be kept to
    // be cleaned up on success, not just the most recently enqueued one.
    merge: (existing, incoming) => ({event: incoming.event, dbIds: [...existing.dbIds, ...incoming.dbIds]}),
    run: (item, strapi) => postInvalidationEvent(item.event, strapi.log),
    onSettled: (item, succeeded, strapi) => {
        if (succeeded) {
            for (const dbId of item.dbIds) {
                void removePending(strapi, dbId);
            }
        }
    },
    // No dead-letter cutoff: an abandoned event leaves the queue and nothing
    // re-reads its row until the next Strapi restart, so a frontend-only outage
    // would leave the caches stale. The capped 60s backoff keeps retrying until
    // the frontend recovers; the durable rows remain as crash safety.
    maxFailureRetries: Number.POSITIVE_INFINITY,
});

export function queueCacheInvalidation(event: InvalidationEvent, strapi: StrapiWithDb | undefined | null): void {
    if (!strapi) {
        console.warn('[cacheInvalidation] Missing strapi instance for cache invalidation', {event});
        return;
    }

    persistPending(strapi, event)
        .then((dbId) => {
            queue.enqueue({event, dbIds: dbId != null ? [dbId] : []}, strapi);
        })
        .catch((error: unknown) => {
            strapi.log.warn('[cacheInvalidationQueue] Failed to persist pending invalidation event.', error);
        });
}

/** Call once at boot to recover events that were persisted but never delivered before a restart. */
export async function restorePendingInvalidations(strapi: StrapiWithDb): Promise<void> {
    const rows = await drainPending(strapi);
    if (rows.length === 0) return;
    queue.restore(
        rows.map((row) => ({event: row.event, dbIds: [row.id]})),
        strapi,
    );
}
