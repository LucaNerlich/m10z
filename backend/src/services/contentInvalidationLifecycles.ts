import {
    LIFECYCLE_INVALIDATION,
    SEARCH_INDEX_REBUILD_UIDS,
    type StrapiLifecycleEvent,
} from '../../../shared/invalidation/manifest';

import {queueCacheInvalidation} from './asyncCacheInvalidationQueue';
import {queueSearchIndexRebuild} from './asyncSearchIndexQueue';

type StrapiGlobal = {
    log?: {info: (message: string) => void};
};

function runInvalidation(uid: string, event: StrapiLifecycleEvent, strapi: StrapiGlobal): void {
    const targets = LIFECYCLE_INVALIDATION[uid]?.[event];
    if (!targets) return;

    for (const target of targets) {
        queueCacheInvalidation(target, strapi);
    }

    if (SEARCH_INDEX_REBUILD_UIDS.has(uid)) {
        queueSearchIndexRebuild(strapi);
    }
}

/**
 * Build Strapi lifecycle exports for a content-type UID from the shared invalidation manifest.
 */
export function createContentInvalidationLifecycles(uid: string): Record<string, (event: unknown) => void> {
    const config = LIFECYCLE_INVALIDATION[uid];
    if (!config) return {};

    const handlers: Record<string, (event: unknown) => void> = {};
    for (const event of Object.keys(config) as StrapiLifecycleEvent[]) {
        handlers[event] = () => {
            runInvalidation(uid, event, strapi);
        };
    }
    return handlers;
}
