import {invalidateNext, type InvalidateTarget} from '../utils/invalidateNextCache';

type StrapiLike = {
    log: {
        info: (message: string) => void;
        warn: (message: string, error?: unknown) => void;
    };
};

const DEBOUNCE_MS = 5000;
let pendingTargets = new Set<InvalidateTarget>();
let isRunning = false;
let debounceTimer: NodeJS.Timeout | null = null;

function clearDebounceTimer(): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
}

function scheduleDebouncedRun(strapi: StrapiLike): void {
    clearDebounceTimer();
    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (isRunning) {
            strapi.log.info('Cache invalidation already running; will rerun after completion.');
            return;
        }
        void runInvalidations(strapi);
    }, DEBOUNCE_MS);
}

async function runInvalidations(strapi: StrapiLike): Promise<void> {
    if (isRunning || pendingTargets.size === 0) {
        return;
    }

    isRunning = true;
    const targets = Array.from(pendingTargets);
    pendingTargets = new Set<InvalidateTarget>();
    strapi.log.info(`Cache invalidation started for ${targets.length} target(s).`);

    try {
        // Parallelize invalidations with a concurrency limit
        const CONCURRENCY_LIMIT = 5;
        const results = await Promise.allSettled(
            targets.slice(0, CONCURRENCY_LIMIT).map(target =>
                invalidateNext(target, strapi.log).catch(err => {
                    // Error already logged by invalidateNext with retry logic
                    throw err; // Re-throw to be caught by allSettled
                })
            )
        );

        // Process remaining targets if any (for when we have more than the concurrency limit)
        for (let i = CONCURRENCY_LIMIT; i < targets.length; i += CONCURRENCY_LIMIT) {
            const batch = targets.slice(i, i + CONCURRENCY_LIMIT);
            const batchResults = await Promise.allSettled(
                batch.map(target =>
                    invalidateNext(target, strapi.log).catch(err => {
                        // Error already logged by invalidateNext with retry logic
                        throw err;
                    })
                )
            );
            results.push(...batchResults);
        }

        // Log summary of results
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
            strapi.log.warn(`Cache invalidation completed: ${successful} successful, ${failed} failed.`);
        }
    } finally {
        isRunning = false;
        strapi.log.info('Cache invalidation completed.');
        if (pendingTargets.size > 0) {
            scheduleDebouncedRun(strapi);
        }
    }
}

export function queueCacheInvalidation(
    target: InvalidateTarget,
    strapi: StrapiLike | undefined | null,
): void {
    if (!strapi) {
        console.warn('[cacheInvalidation] Missing strapiInstance for cache invalidation', {
            target,
        });
        return;
    }

    pendingTargets.add(target);
    strapi.log.info(`Cache invalidation queued for "${target}" (debounced ${DEBOUNCE_MS / 1000}s).`);
    scheduleDebouncedRun(strapi);
}
