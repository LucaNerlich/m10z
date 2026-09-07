import {afterEach, describe, expect, test, vi} from 'vitest';

import {createUmamiClient} from './umamiClient';

const CONFIG = {host: 'https://umami.example.test', username: 'user', password: 's3cret', websiteId: 'site-1'};
const NOW = Date.UTC(2026, 8, 7, 12, 0, 0);

const silentLog = {debug: () => {}, info: () => {}, warn: () => {}, error: () => {}};

type LoggedCall = {url: string; init: {method?: string; headers?: Record<string, string>; body?: string}};

function jsonResponse(data: unknown, status = 200) {
    return {ok: status >= 200 && status < 300, status, json: async () => data};
}

/**
 * Create an injected fetch with URL-routing implementations that records calls.
 */
function setupFetch(impl: (url: string, init: LoggedCall['init']) => unknown) {
    const calls: Array<LoggedCall> = [];
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
            return jsonResponse({token: 'tok-1'});
        }
        expect(init.headers).toMatchObject({authorization: 'Bearer tok-1'});
        if (url.includes('/stats')) {
            return jsonResponse({pageviews: 100, visitors: 40, visits: 50, bounces: 10, totaltime: 99});
        }
        if (url.includes('/event-data/values')) {
            expect(url).toContain('event=podcast-download');
            expect(url).toContain('propertyName=slug');
            return jsonResponse([
                {value: 'ep-b', total: 5},
                {value: 'ep-a', total: 12},
                {value: '', total: 99},
                {value: 'ep-c', total: 1},
            ]);
        }
        throw new Error(`unexpected URL: ${url}`);
    });
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('createUmamiClient.getDashboard', () => {
    test('logs in once and aggregates all ranges with slug breakdowns', async () => {
        const {calls, fetchImpl} = standardFetch();
        const client = createUmamiClient({fetchImpl, now: () => NOW, log: silentLog});

        const payload = await client.getDashboard(CONFIG);

        const logins = calls.filter((call) => call.url.endsWith('/api/auth/login'));
        const gets = calls.filter((call) => call.init.method === 'GET');
        expect(logins).toHaveLength(1);
        // 3 ranges x (stats + event-data/values)
        expect(gets).toHaveLength(6);
        expect(payload.cacheHit).toBe(false);
        expect(payload.cachedAt).toBe(new Date(NOW).toISOString());
        expect(payload.cacheTtlSeconds).toBe(600);
        expect(payload.ranges['7d']).toMatchObject({pageviews: 100, visitors: 40, visits: 50, podcastDownloads: 18});
        expect(payload.ranges['30d']).toMatchObject({podcastDownloads: 18});
        expect(payload.ranges['6m']).toMatchObject({podcastDownloads: 18});
        expect(payload.topSlugs['30d']).toEqual([
            {slug: 'ep-a', downloads: 12},
            {slug: 'ep-b', downloads: 5},
            {slug: 'ep-c', downloads: 1},
        ]);
    });

    test('serves fresh payloads from cache without network calls', async () => {
        const {calls, fetchImpl} = standardFetch();
        let now = NOW;
        const client = createUmamiClient({fetchImpl, now: () => now, log: silentLog});

        await client.getDashboard(CONFIG);
        const callCount = calls.length;
        now += 60_000;
        const cached = await client.getDashboard(CONFIG);

        expect(cached.cacheHit).toBe(true);
        expect(calls).toHaveLength(callCount);
        expect(cached.cachedAt).toBe(new Date(NOW).toISOString());
    });

    test('refetches after the cache TTL expires', async () => {
        const {calls, fetchImpl} = standardFetch();
        let now = NOW;
        const client = createUmamiClient({fetchImpl, now: () => now, log: silentLog});

        await client.getDashboard(CONFIG);
        now += 10 * 60 * 1000 + 1;
        const fresh = await client.getDashboard(CONFIG);

        expect(fresh.cacheHit).toBe(false);
        expect(calls.filter((call) => call.url.endsWith('/api/auth/login'))).toHaveLength(1);
    });

    test('deduplicates concurrent dashboard requests into one fetch cycle', async () => {
        const {calls, fetchImpl} = standardFetch();
        const client = createUmamiClient({fetchImpl, now: () => NOW, log: silentLog});

        const [first, second] = await Promise.all([client.getDashboard(CONFIG), client.getDashboard(CONFIG)]);

        expect(first.cacheHit).toBe(false);
        expect(second.cacheHit).toBe(false);
        expect(calls.filter((call) => call.url.endsWith('/api/auth/login'))).toHaveLength(1);
        expect(calls.filter((call) => call.init.method === 'GET')).toHaveLength(6);
    });

    test('renews the token once after a 401 and retries', async () => {
        let statsCalls = 0;
        const {calls, fetchImpl} = setupFetch((url, init) => {
            if (url.endsWith('/api/auth/login')) {
                return jsonResponse({token: `tok-${calls.filter((call) => call.url.endsWith('/api/auth/login')).length + 1}`});
            }
            if (url.includes('/stats')) {
                statsCalls += 1;
                if (statsCalls === 1) return jsonResponse({error: 'unauthorized'}, 401);
                return jsonResponse({pageviews: 1, visitors: 1, visits: 1});
            }
            return jsonResponse([]);
        });
        const client = createUmamiClient({fetchImpl, now: () => NOW, log: silentLog});

        const payload = await client.getDashboard(CONFIG);

        expect(calls.filter((call) => call.url.endsWith('/api/auth/login'))).toHaveLength(2);
        expect(payload.ranges['7d'].pageviews).toBe(1);
    });

    test('rejects with an auth error when the credentials are rejected', async () => {
        const {fetchImpl} = setupFetch((url) => {
            if (url.endsWith('/api/auth/login')) return jsonResponse({error: 'unauthorized'}, 401);
            throw new Error(`unexpected URL: ${url}`);
        });
        const client = createUmamiClient({fetchImpl, now: () => NOW, log: silentLog});

        await expect(client.getDashboard(CONFIG)).rejects.toMatchObject({code: 'UMAMI_AUTH', status: 502});
    });

    test('rejects with an upstream error on Umami 5xx responses', async () => {
        const {fetchImpl} = setupFetch((url) => {
            if (url.endsWith('/api/auth/login')) return jsonResponse({token: 'tok-1'});
            return jsonResponse({error: 'boom'}, 500);
        });
        const client = createUmamiClient({fetchImpl, now: () => NOW, log: silentLog});

        await expect(client.getDashboard(CONFIG)).rejects.toMatchObject({code: 'UMAMI_UPSTREAM', status: 502});
    });

    test('rejects with an upstream error on network failures', async () => {
        const fetchImpl = vi.fn(async () => {
            throw new TypeError('fetch failed');
        });
        const client = createUmamiClient({fetchImpl, now: () => NOW, log: silentLog});

        await expect(client.getDashboard(CONFIG)).rejects.toMatchObject({code: 'UMAMI_UPSTREAM', status: 502});
    });

    test('never logs secrets', async () => {
        const messages: Array<string> = [];
        const recordingLog = {
            debug: (message: string) => messages.push(message),
            info: (message: string) => messages.push(message),
            warn: (message: string) => messages.push(message),
            error: (message: string) => messages.push(message),
        };
        const fetchImpl = vi.fn(async () => {
            throw new TypeError('fetch failed');
        });
        const client = createUmamiClient({fetchImpl, now: () => NOW, log: recordingLog});

        await expect(client.getDashboard(CONFIG)).rejects.toMatchObject({code: 'UMAMI_UPSTREAM'});
        expect(messages.join('\n')).not.toContain('s3cret');
        expect(messages.join('\n')).not.toContain('tok-1');
    });
});
