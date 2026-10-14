import {afterEach, describe, expect, test, vi} from 'vitest';

import {fetcher, swrConfig} from './config';

// `shouldRetryOnError` reads the fetcher's message, so pass it through a loose
// signature rather than matching SWR's full (error, key, config) arity.
const shouldRetry = swrConfig.shouldRetryOnError as (error: unknown) => boolean;

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
    return new Response(JSON.stringify(body), {
        status: 200,
        ...init,
        headers: {'content-type': 'application/json', ...(init.headers ?? {})},
    });
}

afterEach(() => {
    vi.unstubAllGlobals();
});

/** Run `fetcher` and return the error it throws, typed. */
async function fetcherError(url = '/api/x'): Promise<Error> {
    try {
        await fetcher(url);
    } catch (error) {
        return error as Error;
    }
    throw new Error('expected fetcher to throw');
}

describe('fetcher', () => {
    test('returns parsed JSON for an ok response', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => jsonResponse({value: 1})),
        );

        await expect(fetcher<{value: number}>('/api/x')).resolves.toEqual({value: 1});
    });

    test('throws a status-bearing error for a failed response, without the body', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(
                async () =>
                    new Response('sensitive upstream detail', {
                        status: 429,
                        statusText: 'Too Many Requests',
                    }),
            ),
        );

        const error = await fetcherError();
        expect(error.message).toBe('Request failed: 429 Too Many Requests');
        expect(error.message).not.toContain('sensitive upstream detail');
    });

    test('throws a generic error for an unparseable body', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('{not json', {status: 200})),
        );

        await expect(fetcher('/api/x')).rejects.toThrow('Invalid response format');
    });
});

describe('swrConfig.shouldRetryOnError', () => {
    test('declines to retry timeouts and socket errors', () => {
        expect(shouldRetry(new Error('Request timeout'))).toBe(false);
        expect(shouldRetry(new Error('socket hang up'))).toBe(false);
    });

    test('declines to retry rate limiting and gateway failures', () => {
        expect(shouldRetry(new Error('Request failed: 429 Too Many Requests'))).toBe(false);
        expect(shouldRetry(new Error('Request failed: 502 Bad Gateway'))).toBe(false);
        expect(shouldRetry(new Error('Request failed: 503 Service Unavailable'))).toBe(false);
    });

    test('retries anything else', () => {
        expect(shouldRetry(new Error('Request failed: 500 Internal Server Error'))).toBe(true);
    });

    // Guards the coupling this whole predicate depends on: it matches the text
    // `fetcher` produces, so changing that text would silently start retrying
    // rate-limited requests. This fails if either side drifts.
    test('the fetcher message for a 429 is recognised by the predicate', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('', {status: 429, statusText: 'Too Many Requests'})),
        );

        const error = await fetcherError();
        expect(error.message).toBe('Request failed: 429 Too Many Requests');
        expect(shouldRetry(error)).toBe(false);
    });

    test('a non-HTTP/2 response with an empty statusText is still recognised by status code', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('', {status: 503})),
        );

        const error = await fetcherError();
        expect(shouldRetry(error)).toBe(false);
    });
});
