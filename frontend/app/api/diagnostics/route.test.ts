import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const {verifySecret, checkRateLimit, getRecentDiagnosticEvents, getAudioFeedRuntimeState, getSchedulerState, getClientIp} =
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

import {GET} from './route';

function makeRequest(token?: string): Request {
    const url = token
        ? `https://m10z.de/api/diagnostics?token=${encodeURIComponent(token)}`
        : 'https://m10z.de/api/diagnostics';
    return new Request(url, {method: 'GET'});
}

beforeEach(() => {
    vi.stubEnv('DIAGNOSTICS_TOKEN', 'test-token');
    checkRateLimit.mockReturnValue({ok: true, retryAfterSeconds: 0});
    verifySecret.mockReturnValue(false);
});

afterEach(() => vi.unstubAllEnvs());

describe('GET /api/diagnostics', () => {
    test('returns 401 when no token is provided', async () => {
        verifySecret.mockReturnValue(false);
        const res = await GET(makeRequest());
        expect(res.status).toBe(401);
    });

    test('returns 401 when wrong token is provided', async () => {
        verifySecret.mockReturnValue(false);
        const res = await GET(makeRequest('wrong-token'));
        expect(res.status).toBe(401);
    });

    test('returns 429 with Retry-After header when rate limit is exceeded', async () => {
        verifySecret.mockReturnValue(true);
        checkRateLimit.mockReturnValue({ok: false, retryAfterSeconds: 5});

        const res = await GET(makeRequest('test-token'));

        expect(res.status).toBe(429);
        expect(res.headers.get('Retry-After')).toBe('5');
    });

    test('returns 200 with diagnostic JSON when token is valid and within rate limit', async () => {
        verifySecret.mockReturnValue(true);
        checkRateLimit.mockReturnValue({ok: true, retryAfterSeconds: 0});
        getRecentDiagnosticEvents.mockReturnValue([{type: 'test'}]);
        getAudioFeedRuntimeState.mockReturnValue({running: true});
        getSchedulerState.mockReturnValue({lastRun: 123});

        const res = await GET(makeRequest('test-token'));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('now');
        expect(body).toHaveProperty('events');
        expect(body).toHaveProperty('memory');
        expect(body).toHaveProperty('schedulers');
        expect(typeof body.now).toBe('number');
    });
});
