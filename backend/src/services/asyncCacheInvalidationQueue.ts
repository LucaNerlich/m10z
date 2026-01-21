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
        for (const target of targets) {
            try {
                await invalidateNext(target);
            } catch (err) {
                strapi.log.warn(`Cache invalidation failed for target "${target}".`, err);
            }
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
        return;
    }

    pendingTargets.add(target);
    strapi.log.info(`Cache invalidation queued for "${target}" (debounced ${DEBOUNCE_MS / 1000}s).`);
    scheduleDebouncedRun(strapi);
}
