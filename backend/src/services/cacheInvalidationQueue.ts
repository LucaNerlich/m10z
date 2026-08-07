import type {InvalidationEvent} from '../shared/contracts/strapi-contract/invalidationEvent';

import {AsyncTaskQueue, type StrapiLike} from './asyncTaskQueue';
import {postInvalidationEvent} from '../utils/invalidateNextCache';
import {drainPending, persistPending, removePending, type StrapiDb} from './pendingInvalidationStore';

type QueueItem = {event: InvalidationEvent; dbId: number | null};

function keyOf(item: QueueItem): string {
    const {type, action, slug} = item.event;
    return `${type}:${action}:${slug ?? ''}`;
}

const queue = new AsyncTaskQueue<QueueItem>({
    name: 'cache-invalidation',
    keyOf,
    run: (item, strapi) => postInvalidationEvent(item.event, strapi.log),
    onSettled: (item, succeeded, strapi) => {
        if (succeeded) {
            void removePending(strapi as unknown as StrapiDb, item.dbId);
        }
    },
});

export function queueCacheInvalidation(event: InvalidationEvent, strapi: StrapiLike | undefined | null): void {
    if (!strapi) {
        console.warn('[cacheInvalidation] Missing strapi instance for cache invalidation', {event});
        return;
    }

    void persistPending(strapi as unknown as StrapiDb, event).then((dbId) => {
        queue.enqueue({event, dbId}, strapi);
    });
}

/** Call once at boot to recover events that were persisted but never delivered before a restart. */
export async function restorePendingInvalidations(strapi: StrapiLike): Promise<void> {
    const rows = await drainPending(strapi as unknown as StrapiDb);
    if (rows.length === 0) return;
    queue.restore(
        rows.map((row) => ({event: row.event, dbId: row.id})),
        strapi,
    );
}
