import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {GET} from './route';

const {getRecentDiagnosticEvents, getAudioFeedRuntimeState, getSchedulerState} =
    vi.hoisted(() => ({
        getRecentDiagnosticEvents: vi.fn(),
        getAudioFeedRuntimeState: vi.fn(),
        getSchedulerState: vi.fn(),
    }));

vi.mock('@/src/lib/diagnostics/runtimeDiagnostics', () => ({
    getRecentDiagnosticEvents,
}));

vi.mock('@/src/lib/rss/audioFeedRouteHandler', () => ({
    getAudioFeedRuntimeState,
}));

vi.mock('@/src/lib/rss/articleFeedRouteHandler', () => ({
    getSchedulerState,
}));

const SECRET = 'test-diagnostics-secret';

const MOCK_EVENTS = [
    {ts: 1000, kind: 'fetch', name: 'test', ok: true, durationMs: 5},
];

const MOCK_AUDIO_STATE = {running: true, intervalMs: 300_000};

const MOCK_ARTICLE_STATE = {running: false, intervalMs: 0};

function request(token?: string, ip = '10.0.0.1'): Request {
    const url = token
        ? `https://m10z.de/api/diagnostics?token=${encodeURIComponent(token)}`
        : 'https://m10z.de/api/diagnostics';
    const headers = new Headers({'x-forwarded-for': ip});
    return new Request(url, {headers});
}

function requestWithHeader(token: string, ip = '10.0.0.1'): Request {
    const headers = new Headers({
        'x-forwarded-for': ip,
        'x-m10z-diagnostics-token': token,
    });
    return new Request('https://m10z.de/api/diagnostics', {headers});
}

beforeEach(() => {
    vi.stubEnv('DIAGNOSTICS_TOKEN', SECRET);
    getRecentDiagnosticEvents.mockReturnValue(MOCK_EVENTS);
    getAudioFeedRuntimeState.mockReturnValue(MOCK_AUDIO_STATE);
    getSchedulerState.mockReturnValue(MOCK_ARTICLE_STATE);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('GET /api/diagnostics', () => {
    test('401 when no token is provided', async () => {
        const res = await GET(request());
        expect(res.status).toBe(401);
    });

    test('401 when wrong token is provided', async () => {
        const res = await GET(request('wrong-token'));
        expect(res.status).toBe(401);
    });

    test('200 with diagnostic data on valid token (query param)', async () => {
        const res = await GET(request(SECRET));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body).toMatchObject({
            now: expect.any(Number),
            events: MOCK_EVENTS,
            memory: expect.objectContaining({
                heapUsed: expect.any(Number),
                rss: expect.any(Number),
            }),
            schedulers: {
                audioFeed: MOCK_AUDIO_STATE,
                articleFeed: MOCK_ARTICLE_STATE,
            },
        });
    });

    test('200 when token is provided via x-m10z-diagnostics-token header', async () => {
        const res = await GET(requestWithHeader(SECRET));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body).toMatchObject({
            now: expect.any(Number),
            events: MOCK_EVENTS,
        });
    });

    test('429 when rate limit is exceeded', async () => {
        const ip = 'rate-limited-diag';
        let last: Response | undefined;
        for (let i = 0; i < 31; i++) {
            last = await GET(request(SECRET, ip));
        }
        expect(last?.status).toBe(429);
        expect(last?.headers.get('Retry-After')).toBeTruthy();
    });
});
