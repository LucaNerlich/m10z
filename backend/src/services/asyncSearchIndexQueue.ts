import {buildAndPersistSearchIndex} from './searchIndexBuilder';
import {invalidateNext} from '../utils/invalidateNextCache';

type StrapiLike = {
    log: {
        info: (message: string) => void;
        warn: (message: string, error?: unknown) => void;
    };
};

const DEBOUNCE_MS = 5000;
let pendingRebuild = false;
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
            pendingRebuild = true;
            strapi.log.info('Search index rebuild already running; will rerun after completion.');
            return;
        }
        void runRebuild(strapi);
    }, DEBOUNCE_MS);
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
        const {metrics} = await buildAndPersistSearchIndex(strapi as any);
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
            strapi.log.info('Search index rebuild completed.');
        } else {
            strapi.log.warn('Search index rebuild failed.', rebuildError);
        }
        if (pendingRebuild) {
            scheduleDebouncedRun(strapi);
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
