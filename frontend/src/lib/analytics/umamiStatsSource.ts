/**
 * Soft-fail loaders for live Umami traffic on `/statistik` and `/statistik/reichweite`.
 *
 * Returns `null` when credentials are missing or Umami is unreachable so the
 * page can omit the traffic panel without failing the editorial snapshot.
 *
 * Unconfigured deploys skip `unstable_cache` entirely so adding secrets later
 * is not stuck behind a cached null from build time.
 */
import 'server-only';

import {cache} from 'react';
import {unstable_cache} from 'next/cache';

import {createUmamiStatsClient} from '@/src/lib/analytics/umamiStatsClient';
import {
    type UmamiReachDetailStats,
    type UmamiStatsConfig,
    type UmamiTrafficStats,
    readUmamiStatsConfig,
} from '@/src/lib/analytics/umamiStats';
import {CACHE_REVALIDATE_UMAMI, UMAMI_STATS_CACHE_TAG} from '@/src/lib/cache/constants';
import {getErrorMessage} from '@/src/lib/errors';

function createLoggedClient() {
    return createUmamiStatsClient({
        log: {
            warn: (...args) => {
                console.warn(...args);
            },
        },
    });
}

async function fetchUmamiTrafficStats(config: UmamiStatsConfig): Promise<UmamiTrafficStats> {
    return createLoggedClient().getTrafficStats(config);
}

async function fetchUmamiReachDetailStats(config: UmamiStatsConfig): Promise<UmamiReachDetailStats> {
    return createLoggedClient().getReachDetailStats(config);
}

const getCachedUmamiTrafficStats = unstable_cache(
    async (): Promise<UmamiTrafficStats | null> => {
        const config = readUmamiStatsConfig();
        if (!config.ok) return null;
        try {
            return await fetchUmamiTrafficStats(config.value);
        } catch (error) {
            console.warn('[umami-stats] Failed to load traffic stats:', getErrorMessage(error));
            return null;
        }
    },
    ['umami-traffic-stats'],
    {
        revalidate: CACHE_REVALIDATE_UMAMI,
        tags: [UMAMI_STATS_CACHE_TAG],
    }
);

const getCachedUmamiReachDetailStats = unstable_cache(
    async (): Promise<UmamiReachDetailStats | null> => {
        const config = readUmamiStatsConfig();
        if (!config.ok) return null;
        try {
            return await fetchUmamiReachDetailStats(config.value);
        } catch (error) {
            console.warn('[umami-stats] Failed to load reach detail stats:', getErrorMessage(error));
            return null;
        }
    },
    ['umami-reach-detail-stats'],
    {
        revalidate: CACHE_REVALIDATE_UMAMI,
        tags: [UMAMI_STATS_CACHE_TAG],
    }
);

/**
 * Per-request deduplicated Umami traffic stats (or `null` on soft-fail).
 */
export const getUmamiTrafficStats = cache(async (): Promise<UmamiTrafficStats | null> => {
    const config = readUmamiStatsConfig();
    if (!config.ok) {
        // Soft-fail without caching: secrets may be added after a cold deploy.
        return null;
    }

    try {
        return await getCachedUmamiTrafficStats();
    } catch (error) {
        console.warn('[umami-stats] Failed to load traffic stats:', getErrorMessage(error));
        return null;
    }
});

/**
 * Multi-range article/podcast rankings for `/statistik/reichweite` (or `null` on soft-fail).
 */
export const getUmamiReachDetailStats = cache(async (): Promise<UmamiReachDetailStats | null> => {
    const config = readUmamiStatsConfig();
    if (!config.ok) {
        return null;
    }

    try {
        return await getCachedUmamiReachDetailStats();
    } catch (error) {
        console.warn('[umami-stats] Failed to load reach detail stats:', getErrorMessage(error));
        return null;
    }
});
