import {beforeEach, describe, expect, test, vi} from 'vitest';

const getTrafficStats = vi.fn();
const getReachDetailStats = vi.fn();
const readUmamiStatsConfig = vi.fn();

vi.mock('server-only', () => ({}));

// Minimal stand-in for `unstable_cache` that reproduces the behaviour the fix
// depends on: a resolved value is cached, a rejection propagates and is *not*
// stored.
vi.mock('next/cache', () => ({
    unstable_cache: (fn: () => Promise<unknown>) => {
        let cached: {value: unknown} | null = null;
        return async () => {
            if (cached) return cached.value;
            const value = await fn();
            cached = {value};
            return value;
        };
    },
}));

vi.mock('@/src/lib/analytics/umamiStatsClient', () => ({
    createUmamiStatsClient: () => ({getTrafficStats, getReachDetailStats}),
}));

vi.mock('@/src/lib/analytics/umamiStats', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/src/lib/analytics/umamiStats')>();
    return {...actual, readUmamiStatsConfig};
});

/**
 * Each test gets a fresh copy of the module under test, because its
 * `unstable_cache` stand-in (like the real one) is process-global.
 */
async function loadSource() {
    vi.resetModules();
    return import('./umamiStatsSource');
}

const CONFIG = {host: 'https://umami.example', username: 'u', password: 'p', websiteId: 'w'};
const STATS = {visitors: 1};

beforeEach(() => {
    getTrafficStats.mockReset();
    getReachDetailStats.mockReset();
    readUmamiStatsConfig.mockReset();
    readUmamiStatsConfig.mockReturnValue({ok: true, value: CONFIG});
});

describe('getUmamiTrafficStats', () => {
    test('returns stats on success and caches them', async () => {
        const {getUmamiTrafficStats} = await loadSource();
        getTrafficStats.mockResolvedValue(STATS);

        expect(await getUmamiTrafficStats()).toEqual(STATS);
        expect(await getUmamiTrafficStats()).toEqual(STATS);
        expect(getTrafficStats).toHaveBeenCalledTimes(1);
    });

    test('a transient failure is soft-failed and NOT cached, so the next request retries', async () => {
        const {getUmamiTrafficStats} = await loadSource();
        getTrafficStats.mockRejectedValueOnce(new Error('umami 503'));
        getTrafficStats.mockResolvedValue(STATS);

        // First request: soft-fail, no throw to the page.
        expect(await getUmamiTrafficStats()).toBeNull();
        // Second request: retried (a cached null before the fix) and recovers.
        expect(await getUmamiTrafficStats()).toEqual(STATS);
        expect(getTrafficStats).toHaveBeenCalledTimes(2);
    });

    test('an unconfigured deploy soft-fails without touching Umami', async () => {
        const {getUmamiTrafficStats} = await loadSource();
        readUmamiStatsConfig.mockReturnValue({ok: false, missing: ['UMAMI_HOST']});

        expect(await getUmamiTrafficStats()).toBeNull();
        expect(getTrafficStats).not.toHaveBeenCalled();
    });
});

describe('getUmamiReachDetailStats', () => {
    test('a transient failure is soft-failed and NOT cached, so the next request retries', async () => {
        const {getUmamiReachDetailStats} = await loadSource();
        getReachDetailStats.mockRejectedValueOnce(new Error('umami timeout'));
        getReachDetailStats.mockResolvedValue({ranges: []});

        expect(await getUmamiReachDetailStats()).toBeNull();
        expect(await getUmamiReachDetailStats()).toEqual({ranges: []});
        expect(getReachDetailStats).toHaveBeenCalledTimes(2);
    });
});
