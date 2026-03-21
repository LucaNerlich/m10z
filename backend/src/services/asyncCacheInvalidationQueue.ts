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

async function runBatch(strapi: StrapiLike, batch: InvalidateTarget[]): Promise<boolean[]> {
    return Promise.all(batch.map((target) => invalidateNext(target, strapi.log)));
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
        const CONCURRENCY_LIMIT = 5;
        const outcomes: boolean[] = [];

        for (let i = 0; i < targets.length; i += CONCURRENCY_LIMIT) {
            const batch = targets.slice(i, i + CONCURRENCY_LIMIT);
            const batchOutcomes = await runBatch(strapi, batch);
            outcomes.push(...batchOutcomes);
        }

        const successful = outcomes.filter(Boolean).length;
        const failed = outcomes.length - successful;
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
