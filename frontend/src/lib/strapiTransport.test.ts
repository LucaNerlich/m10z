import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {
    __resetStrapiTransport,
    __setStrapiTransport,
    getStrapiApiBaseUrl,
    strapiFetch,
    type StrapiRequest,
} from './strapiTransport';

function okJson(body: unknown): Response {
    return {ok: true, status: 200, statusText: 'OK', json: async () => body} as unknown as Response;
}

function httpError(status: number): Response {
    return {ok: false, status, statusText: 'Boom', json: async () => ({})} as unknown as Response;
}

function abortError(): Error {
    return Object.assign(new Error('aborted'), {name: 'AbortError'});
}

beforeEach(() => {
    vi.stubEnv('STRAPI_URL', 'http://localhost:1337');
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    __resetStrapiTransport();
});

describe('getStrapiApiBaseUrl', () => {
    test('reads STRAPI_URL', () => {
        expect(getStrapiApiBaseUrl().toString()).toBe('http://localhost:1337/');
    });

    test('throws when no env var is set', () => {
        vi.stubEnv('STRAPI_URL', '');
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', '');
        expect(() => getStrapiApiBaseUrl()).toThrow(/Missing STRAPI_URL/);
    });
});

describe('defaultStrapiTransport (via strapiFetch)', () => {
    test('resolves the path against the base URL and returns parsed JSON', async () => {
        const fetchMock = vi.fn().mockResolvedValue(okJson({data: [1, 2]}));
        vi.stubGlobal('fetch', fetchMock);

        const body = await strapiFetch<{data: number[]}>({
            path: '/api/articles?x=1',
            cache: {mode: 'tags', tags: ['strapi:article']},
        });

        expect(body).toEqual({data: [1, 2]});
        expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:1337/api/articles?x=1');
    });

    test('attaches a Bearer token only when one is provided', async () => {
        const fetchMock = vi.fn().mockResolvedValue(okJson({}));
        vi.stubGlobal('fetch', fetchMock);

        await strapiFetch({path: '/api/x', token: 'secret', cache: {mode: 'tags', tags: []}});
        const authed = fetchMock.mock.calls[0][1] as RequestInit;
        expect((authed.headers as Headers).get('Authorization')).toBe('Bearer secret');

        await strapiFetch({path: '/api/x', cache: {mode: 'tags', tags: []}});
        const anon = fetchMock.mock.calls[1][1] as RequestInit;
        expect((anon.headers as Headers).get('Authorization')).toBeNull();
    });

    test('auth \'privileged\' attaches the env token; explicit token wins', async () => {
        const fetchMock = vi.fn().mockResolvedValue(okJson({}));
        vi.stubGlobal('fetch', fetchMock);
        vi.stubEnv('STRAPI_API_TOKEN', 'env-token');

        await strapiFetch({path: '/api/x', auth: 'privileged', cache: {mode: 'tags', tags: []}});
        const privileged = fetchMock.mock.calls[0][1] as RequestInit;
        expect((privileged.headers as Headers).get('Authorization')).toBe('Bearer env-token');

        await strapiFetch({path: '/api/x', auth: 'privileged', token: 'explicit', cache: {mode: 'tags', tags: []}});
        const explicit = fetchMock.mock.calls[1][1] as RequestInit;
        expect((explicit.headers as Headers).get('Authorization')).toBe('Bearer explicit');

        await strapiFetch({path: '/api/x', auth: 'public', cache: {mode: 'tags', tags: []}});
        const pub = fetchMock.mock.calls[2][1] as RequestInit;
        expect((pub.headers as Headers).get('Authorization')).toBeNull();
    });

    test('maps the tags directive to Next cache options', async () => {
        const fetchMock = vi.fn().mockResolvedValue(okJson({}));
        vi.stubGlobal('fetch', fetchMock);

        await strapiFetch({path: '/api/x', cache: {mode: 'tags', tags: ['a', 'b'], revalidate: 900}});
        const init = fetchMock.mock.calls[0][1] as {next?: {tags: string[]; revalidate?: number}; cache?: string};
        expect(init.next).toEqual({tags: ['a', 'b'], revalidate: 900});
        expect(init.cache).toBeUndefined();
    });

    test('maps no-store with tags, and bare no-store without', async () => {
        const fetchMock = vi.fn().mockResolvedValue(okJson({}));
        vi.stubGlobal('fetch', fetchMock);

        await strapiFetch({path: '/api/x', cache: {mode: 'no-store', tags: ['feed:audio']}});
        const withTags = fetchMock.mock.calls[0][1] as {cache?: string; next?: {tags: string[]}};
        expect(withTags.cache).toBe('no-store');
        expect(withTags.next).toEqual({tags: ['feed:audio']});

        await strapiFetch({path: '/api/x', cache: {mode: 'no-store'}});
        const bare = fetchMock.mock.calls[1][1] as {cache?: string; next?: unknown};
        expect(bare.cache).toBe('no-store');
        expect(bare.next).toBeUndefined();
    });

    test('throws on a non-OK response and does not retry', async () => {
        const fetchMock = vi.fn().mockResolvedValue(httpError(404));
        vi.stubGlobal('fetch', fetchMock);

        await expect(strapiFetch({path: '/api/x', cache: {mode: 'tags', tags: []}})).rejects.toThrow(/404/);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test('retries once on a transient failure, then succeeds', async () => {
        const fetchMock = vi
            .fn()
            .mockRejectedValueOnce(abortError())
            .mockResolvedValueOnce(okJson({data: 'ok'}));
        vi.stubGlobal('fetch', fetchMock);

        const body = await strapiFetch<{data: string}>({path: '/api/x', cache: {mode: 'tags', tags: []}});
        expect(body).toEqual({data: 'ok'});
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    test('wraps an abort as a timeout error after exhausting retries', async () => {
        const fetchMock = vi.fn().mockRejectedValue(abortError());
        vi.stubGlobal('fetch', fetchMock);

        await expect(
            strapiFetch({path: '/api/x', cache: {mode: 'tags', tags: []}, timeoutMs: 10}),
        ).rejects.toThrow(/timed out/);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});

describe('injectable transport port', () => {
    test('strapiFetch routes through a swapped-in adapter', async () => {
        const seen: StrapiRequest[] = [];
        __setStrapiTransport(async <T>(req: StrapiRequest): Promise<T> => {
            seen.push(req);
            return {data: 'in-memory'} as T;
        });

        const body = await strapiFetch<{data: string}>({path: '/api/x', cache: {mode: 'tags', tags: ['t']}});
        expect(body).toEqual({data: 'in-memory'});
        expect(seen).toHaveLength(1);
        expect(seen[0].path).toBe('/api/x');
    });

    test('reset restores the default transport', async () => {
        __setStrapiTransport(async <T>(): Promise<T> => ({data: 'fake'}) as T);
        __resetStrapiTransport();

        const fetchMock = vi.fn().mockResolvedValue(okJson({data: 'real'}));
        vi.stubGlobal('fetch', fetchMock);
        const body = await strapiFetch<{data: string}>({path: '/api/x', cache: {mode: 'tags', tags: []}});
        expect(body).toEqual({data: 'real'});
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
