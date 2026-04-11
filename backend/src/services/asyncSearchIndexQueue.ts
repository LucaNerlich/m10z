import {buildAndPersistSearchIndex} from './searchIndexBuilder';
import {invalidateNext} from '../utils/invalidateNextCache';

type StrapiLike = {
    log: {
        info: (message: string) => void;
        warn: (message: string, error?: unknown) => void;
    };
};

const DEBOUNCE_MS = 5000;
const MAX_FAILURE_RETRIES = 5;
// State machine: pendingRebuild flags a queued rebuild, isRunning prevents concurrent runs.
// When a rebuild finishes and pendingRebuild is still set, it re-schedules itself.
let pendingRebuild = false;
let isRunning = false;
let consecutiveFailures = 0;
let debounceTimer: NodeJS.Timeout | null = null;

function clearDebounceTimer(): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
}

function scheduleDebouncedRun(strapi: StrapiLike): void {
    clearDebounceTimer();
    // Exponential backoff on failures: 5s → 10s → 20s → 40s → 60s (capped).
    const delay = consecutiveFailures > 0
        ? Math.min(DEBOUNCE_MS * Math.pow(2, consecutiveFailures), 60_000)
        : DEBOUNCE_MS;
    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (isRunning) {
            pendingRebuild = true;
            strapi.log.info('Search index rebuild already running; will rerun after completion.');
            return;
        }
        void runRebuild(strapi);
    }, delay);
}

async function runRebuild(strapi: StrapiLike): Promise<void> {
    if (isRunning || !pendingRebuild) {
        return;
    }

    isRunning = true;
    pendingRebuild = false;
    strapi.log.info('Search index rebuild started.');

    let succeeded = true;
    let rebuildError: unknown;
    try {
        const {metrics} = await buildAndPersistSearchIndex(strapi as any, {source: 'queue'});
        strapi.log.info(
            `searchIndexSummary source=queue articles=${metrics.counts.articles} podcasts=${metrics.counts.podcasts} authors=${metrics.counts.authors} categories=${metrics.counts.categories} total=${metrics.counts.total} buildMs=${metrics.buildMs} fetchMs=${metrics.fetchMs.total} processingMs=${metrics.processingMs} payloadBytes=${metrics.payloadBytes} payloadKb=${metrics.payloadKb}`,
        );
        await invalidateNext('search-index');
        await invalidateNext('sitemap');
    } catch (err) {
        succeeded = false;
        rebuildError = err;
    } finally {
        isRunning = false;
        if (succeeded) {
            consecutiveFailures = 0;
            strapi.log.info('Search index rebuild completed.');
        } else {
            consecutiveFailures++;
            strapi.log.warn(`Search index rebuild failed (attempt ${consecutiveFailures}).`, rebuildError);
        }
        if (pendingRebuild) {
            if (!succeeded && consecutiveFailures >= MAX_FAILURE_RETRIES) {
                strapi.log.warn(`Search index rebuild abandoned after ${MAX_FAILURE_RETRIES} consecutive failures. Will retry on next content change.`);
                pendingRebuild = false;
            } else {
                scheduleDebouncedRun(strapi);
            }
        }
    }
}

export function queueSearchIndexRebuild(strapi: StrapiLike | undefined | null): void {
    if (!strapi) {
        return;
    }

    pendingRebuild = true;
    strapi.log.info(`Search index rebuild queued (debounced ${DEBOUNCE_MS / 1000}s).`);
    scheduleDebouncedRun(strapi);
}
