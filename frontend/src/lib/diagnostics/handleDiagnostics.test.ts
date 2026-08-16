import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {handleDiagnosticsGet} from './handleDiagnostics';

const {
    verifySecret,
    checkRateLimit,
    getRecentDiagnosticEvents,
    getAudioFeedRuntimeState,
    getSchedulerState,
    getClientIp,
} =
    vi.hoisted(() => ({
        verifySecret: vi.fn(),
        checkRateLimit: vi.fn(),
        getRecentDiagnosticEvents: vi.fn().mockReturnValue([]),
        getAudioFeedRuntimeState: vi.fn().mockReturnValue({}),
        getSchedulerState: vi.fn().mockReturnValue({}),
        getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
    }));

vi.mock('@/src/lib/security/verifySecret', () => ({verifySecret}));
vi.mock('@/src/lib/security/rateLimit', () => ({checkRateLimit}));
vi.mock('@/src/lib/diagnostics/runtimeDiagnostics', () => ({getRecentDiagnosticEvents}));
vi.mock('@/src/lib/rss/audioFeedRouteHandler', () => ({getAudioFeedRuntimeState}));
vi.mock('@/src/lib/rss/articleFeedRouteHandler', () => ({
    getSchedulerState,
    buildArticleFeedResponse: vi.fn(),
}));
vi.mock('@/src/lib/net/getClientIp', () => ({getClientIp}));

function makeQueryParamRequest(token?: string): Request {
    const url = token
        ? `https://m10z.de/api/diagnostics?token=${encodeURIComponent(token)}`
        : 'https://m10z.de/api/diagnostics';
    return new Request(url, {method: 'GET'});
}

function makeHeaderRequest(token: string): Request {
    const headers = new Headers({'x-m10z-diagnostics-token': token});
    return new Request('https://m10z.de/api/diagnostics', {method: 'GET', headers});
}

beforeEach(() => {
    vi.stubEnv('DIAGNOSTICS_TOKEN', 'test-token');
    checkRateLimit.mockReturnValue({ok: true, retryAfterSeconds: 0});
    verifySecret.mockReturnValue(false);
});

afterEach(() => vi.unstubAllEnvs());

describe('handleDiagnosticsGet', () => {
    test('returns 401 when no token is provided', async () => {
        verifySecret.mockReturnValue(false);
        const res = await handleDiagnosticsGet(makeHeaderRequest(''));
        expect(res.status).toBe(401);
    });

    test('returns 401 when wrong token is provided', async () => {
        verifySecret.mockReturnValue(false);
        const res = await handleDiagnosticsGet(makeHeaderRequest('wrong-token'));
        expect(res.status).toBe(401);
    });

    test('ignores query-param tokens (header-only authentication)', async () => {
        verifySecret.mockReturnValue(false);
        const res = await handleDiagnosticsGet(makeQueryParamRequest('test-token'));
        expect(res.status).toBe(401);
        expect(verifySecret).toHaveBeenCalledWith(null, 'test-token');
    });

    test('returns 429 with Retry-After header when rate limit is exceeded', async () => {
        verifySecret.mockReturnValue(true);
        checkRateLimit.mockReturnValue({ok: false, retryAfterSeconds: 5});

        const res = await handleDiagnosticsGet(makeHeaderRequest('test-token'));

        expect(res.status).toBe(429);
        expect(res.headers.get('Retry-After')).toBe('5');
    });

    test('checks the rate limit even for unauthenticated requests', async () => {
        verifySecret.mockReturnValue(false);
        checkRateLimit.mockReturnValue({ok: false, retryAfterSeconds: 7});

        const res = await handleDiagnosticsGet(makeHeaderRequest('wrong-token'));

        expect(res.status).toBe(429);
        expect(checkRateLimit).toHaveBeenCalled();
    });

    test('returns 200 with diagnostic JSON when token is valid and within rate limit', async () => {
        verifySecret.mockReturnValue(true);
        checkRateLimit.mockReturnValue({ok: true, retryAfterSeconds: 0});
        getRecentDiagnosticEvents.mockReturnValue([{type: 'test', ts: 1, kind: 'route', name: 'x', ok: true, durationMs: 1}]);
        getAudioFeedRuntimeState.mockReturnValue({running: true, lastFetchMs: 100});
        getSchedulerState.mockReturnValue({lastRun: 123, intervalMs: 60000});

        const res = await handleDiagnosticsGet(makeHeaderRequest('test-token'));

        expect(res.status).toBe(200);
        expect(res.headers.get('Cache-Control')).toBe('no-store');
        const body = await res.json();
        expect(body).toMatchObject({
            events: [{type: 'test', ts: 1, kind: 'route', name: 'x', ok: true, durationMs: 1}],
            schedulers: {
                audioFeed: {running: true, lastFetchMs: 100},
                articleFeed: {lastRun: 123, intervalMs: 60000},
            },
        });
        expect(typeof body.now).toBe('number');
        expect(body).toHaveProperty('memory');
    });

    test('returns 200 when token is provided via x-m10z-diagnostics-token header', async () => {
        verifySecret.mockReturnValue(true);
        checkRateLimit.mockReturnValue({ok: true, retryAfterSeconds: 0});

        const res = await handleDiagnosticsGet(makeHeaderRequest('test-token'));

        expect(verifySecret).toHaveBeenCalledWith('test-token', 'test-token');
        expect(res.status).toBe(200);
    });
});
