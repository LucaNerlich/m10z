import {afterEach, describe, expect, test, vi} from 'vitest';

import {UmamiClientError, createUmamiStatsClient} from './umamiStatsClient';

const CONFIG = {
    host: 'https://umami.example.test',
    username: 'user',
    password: 's3cret',
    websiteId: 'site-1',
};
const NOW = Date.UTC(2026, 8, 7, 12, 0, 0);

const silentLog = {warn: () => {}};

type LoggedCall = {
    url: string;
    init: {method?: string; headers?: Record<string, string>; body?: string; redirect?: string; cache?: string};
};

function jsonResponse(data: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => data,
    };
}

function setupFetch(impl: (url: string, init: LoggedCall['init']) => unknown) {
    const calls: LoggedCall[] = [];
    const fetchImpl = vi.fn(async (url: string, init: LoggedCall['init'] = {}) => {
        calls.push({url, init});
        return impl(url, init);
    });
    return {calls, fetchImpl};
}

function standardFetch() {
    return setupFetch((url, init) => {
        if (url.endsWith('/api/auth/login')) {
            expect(init.method).toBe('POST');
            expect(JSON.parse(init.body || '{}')).toEqual({username: 'user', password: 's3cret'});
            expect(init.cache).toBe('no-store');
            return jsonResponse({token: 'tok-1'});
        }
        expect(init.headers).toMatchObject({authorization: 'Bearer tok-1'});
        expect(init.cache).toBe('no-store');
        if (url.includes('/stats')) {
            return jsonResponse({
                pageviews: {value: 100, prev: 90},
                visitors: {value: 40, prev: 30},
                visits: {value: 50, prev: 45},
                bounces: 10,
            });
        }
        throw new Error(`unexpected URL: ${url}`);
    });
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('createUmamiStatsClient.getTrafficStats', () => {
    test('logs in once and returns the 30d range', async () => {
        const {calls, fetchImpl} = standardFetch();
        const client = createUmamiStatsClient({fetchImpl: fetchImpl as typeof fetch, now: () => NOW, log: silentLog});

        const payload = await client.getTrafficStats(CONFIG);

        const logins = calls.filter((call) => call.url.endsWith('/api/auth/login'));
        const gets = calls.filter((call) => call.init.method === 'GET');
        expect(logins).toHaveLength(1);
        expect(calls.every((call) => call.init.redirect === 'error')).toBe(true);
        expect(gets).toHaveLength(1);
        expect(payload.cacheTtlSeconds).toBe(600);
        expect(payload.cachedAt).toBe(new Date(NOW).toISOString());
        expect(payload.ranges['30d']).toMatchObject({pageviews: 100, visitors: 40, visits: 50});
    });

    test('retries once after a 401 by re-authenticating', async () => {
        let loginCount = 0;
        let statsHits = 0;
        const {fetchImpl} = setupFetch((url) => {
            if (url.endsWith('/api/auth/login')) {
                loginCount += 1;
                return jsonResponse({token: `tok-${loginCount}`});
            }
            statsHits += 1;
            if (statsHits === 1) {
                return jsonResponse(null, 401);
            }
            return jsonResponse({pageviews: 3, visitors: 2, visits: 1});
        });

        const client = createUmamiStatsClient({fetchImpl: fetchImpl as typeof fetch, now: () => NOW, log: silentLog});
        const payload = await client.getTrafficStats(CONFIG);

        expect(loginCount).toBe(2);
        expect(payload.ranges['30d'].visitors).toBe(2);
    });

    test('throws UMAMI_AUTH when login is rejected', async () => {
        const {fetchImpl} = setupFetch(() => jsonResponse(null, 401));
        const client = createUmamiStatsClient({fetchImpl: fetchImpl as typeof fetch, now: () => NOW, log: silentLog});

        await expect(client.getTrafficStats(CONFIG)).rejects.toMatchObject({
            code: 'UMAMI_AUTH',
        } satisfies Partial<UmamiClientError>);
    });

    test('throws UMAMI_UPSTREAM on network failure without leaking secrets', async () => {
        const warnings: unknown[][] = [];
        const {fetchImpl} = setupFetch(() => {
            throw new TypeError('fetch failed');
        });
        const client = createUmamiStatsClient({
            fetchImpl: fetchImpl as typeof fetch,
            now: () => NOW,
            log: {
                warn: (...args) => {
                    warnings.push(args);
                },
            },
        });

        await expect(client.getTrafficStats(CONFIG)).rejects.toMatchObject({code: 'UMAMI_UPSTREAM'});
        expect(JSON.stringify(warnings)).not.toContain('s3cret');
        expect(JSON.stringify(warnings)).not.toContain('user');
    });
});
