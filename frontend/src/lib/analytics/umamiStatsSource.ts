/**
 * Soft-fail loader for live Umami traffic on `/statistik`.
 *
 * Returns `null` when credentials are missing or Umami is unreachable so the
 * page can omit the traffic panel without failing the editorial snapshot.
 */
import 'server-only';

import {cache} from 'react';
import {unstable_cache} from 'next/cache';

import {createUmamiStatsClient} from '@/src/lib/analytics/umamiStatsClient';
import {type UmamiTrafficStats, readUmamiStatsConfig} from '@/src/lib/analytics/umamiStats';
import {CACHE_REVALIDATE_UMAMI, UMAMI_STATS_CACHE_TAG} from '@/src/lib/cache/constants';
import {getErrorMessage} from '@/src/lib/errors';

async function fetchUmamiTrafficStatsUncached(): Promise<UmamiTrafficStats | null> {
    const config = readUmamiStatsConfig();
    if (!config.ok) {
        // Soft-fail: page stays editorial-only when ops has not wired secrets.
        return null;
    }

    try {
        const client = createUmamiStatsClient({
            log: {
                warn: (...args) => {
                    console.warn(...args);
                },
            },
        });
        return await client.getTrafficStats(config.value);
    } catch (error) {
        // Never log credentials or response bodies — coded client errors are safe.
        console.warn('[umami-stats] Failed to load traffic stats:', getErrorMessage(error));
        return null;
    }
}

const getCachedUmamiTrafficStats = unstable_cache(fetchUmamiTrafficStatsUncached, ['umami-traffic-stats'], {
    revalidate: CACHE_REVALIDATE_UMAMI,
    tags: [UMAMI_STATS_CACHE_TAG],
});

/**
 * Per-request deduplicated Umami traffic stats (or `null` on soft-fail).
 */
export const getUmamiTrafficStats = cache(async (): Promise<UmamiTrafficStats | null> => {
    return getCachedUmamiTrafficStats();
});
