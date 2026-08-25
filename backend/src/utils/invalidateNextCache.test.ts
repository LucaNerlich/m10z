import {afterEach, describe, expect, test, vi} from 'vitest';

import {postInvalidationEvent} from './invalidateNextCache';

const logger = {info: vi.fn(), warn: vi.fn()};
const event = {type: 'article', action: 'publish', slug: 'my-article'} as const;

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

function stubConfiguredEnv() {
    vi.stubEnv('FRONTEND_URL', 'https://m10z.de');
    vi.stubEnv('STRAPI_INVALIDATION_SECRET', 'secret-token');
}

describe('postInvalidationEvent', () => {
    test('returns false and skips the request when no secret is configured', async () => {
        vi.stubEnv('STRAPI_INVALIDATION_SECRET', undefined);
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const result = await postInvalidationEvent(event, logger);

        expect(result).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('POSTs the event body to /api/invalidate with the secret header on success', async () => {
        stubConfiguredEnv();
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, {status: 200}));
        vi.stubGlobal('fetch', fetchMock);

        const result = await postInvalidationEvent(event, logger);

        expect(result).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://m10z.de/api/invalidate');
        expect(init.method).toBe('POST');
        expect(init.headers['x-m10z-invalidation-secret']).toBe('secret-token');
        expect(init.redirect).toBe('error');
        expect(JSON.parse(init.body)).toEqual(event);
    });

    test('does not retry on a 4xx client error', async () => {
        stubConfiguredEnv();
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, {status: 404, statusText: 'Not Found'}));
        vi.stubGlobal('fetch', fetchMock);

        const result = await postInvalidationEvent(event, logger, 3);

        expect(result).toBe(false);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test('retries on 5xx errors up to maxRetries, then gives up', async () => {
        vi.useFakeTimers();
        try {
            stubConfiguredEnv();
            const fetchMock = vi.fn().mockResolvedValue(new Response(null, {status: 503, statusText: 'Unavailable'}));
            vi.stubGlobal('fetch', fetchMock);

            const promise = postInvalidationEvent(event, logger, 3);
            await vi.advanceTimersByTimeAsync(5000);
            const result = await promise;

            expect(result).toBe(false);
            expect(fetchMock).toHaveBeenCalledTimes(3);
        } finally {
            vi.useRealTimers();
        }
    });

    test('retries on network errors and resolves false after exhausting attempts', async () => {
        vi.useFakeTimers();
        try {
            stubConfiguredEnv();
            const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
            vi.stubGlobal('fetch', fetchMock);

            const promise = postInvalidationEvent(event, logger, 2);
            await vi.advanceTimersByTimeAsync(5000);
            const result = await promise;

            expect(result).toBe(false);
            expect(fetchMock).toHaveBeenCalledTimes(2);
        } finally {
            vi.useRealTimers();
        }
    });
});
