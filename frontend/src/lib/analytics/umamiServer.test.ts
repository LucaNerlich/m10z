import {afterEach, describe, expect, test, vi} from 'vitest';

import {PODCAST_DOWNLOAD_EVENT, sendPodcastDownloadEvent} from './umamiServer';

function makeRequest(headers: Record<string, string> = {}): Request {
    return new Request('https://m10z.de/api/podcast-download/ep-1', {headers});
}

type FetchCall = [string, {method: string; headers: Record<string, string>; body: string; signal?: unknown}];

const UMAMI_COLLECTOR_USER_AGENT =
    'Mozilla/5.0 (M10Z Server-Side Analytics; +https://m10z.de)';

function mockFetchOk() {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {status: 200}));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('sendPodcastDownloadEvent', () => {
    test('does not call fetch when the website id is unset', async () => {
        vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', undefined);
        const fetchMock = mockFetchOk();

        await sendPodcastDownloadEvent({slug: 'ep-1', title: 'Episode 1', request: makeRequest()});

        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('posts a custom event to /api/send with the expected payload and attribution headers', async () => {
        vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', 'site-123');
        vi.stubEnv('NEXT_PUBLIC_UMAMI_URL', 'https://umami.example.test');
        vi.stubEnv('NEXT_PUBLIC_DOMAIN', 'https://m10z.de');
        const fetchMock = mockFetchOk();

        await sendPodcastDownloadEvent({
            slug: 'ep-1',
            title: 'Episode 1',
            request: makeRequest({
                'user-agent': 'PodcatcherApp/2.0',
                'x-forwarded-for': '203.0.113.7, 10.0.0.1',
            }),
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as FetchCall;
        expect(url).toBe('https://umami.example.test/api/send');
        expect(init.method).toBe('POST');
        expect(init.headers['content-type']).toBe('application/json');
        expect(init.headers['user-agent']).toBe(UMAMI_COLLECTOR_USER_AGENT);
        // Only the first hop of x-forwarded-for is forwarded.
        expect(init.headers['x-forwarded-for']).toBe('203.0.113.7');
        expect(init.signal).toBeInstanceOf(AbortSignal);

        expect(JSON.parse(init.body)).toEqual({
            type: 'event',
            payload: {
                website: 'site-123',
                hostname: 'm10z.de',
                url: '/podcasts/ep-1',
                name: PODCAST_DOWNLOAD_EVENT,
                data: {slug: 'ep-1', title: 'Episode 1'},
            },
        });
    });

    test('does not forward podcatcher user agents as the Umami collector user agent', async () => {
        vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', 'site-123');
        const fetchMock = mockFetchOk();

        await sendPodcastDownloadEvent({
            slug: 'ep-1',
            request: makeRequest({'user-agent': 'PodcatcherBot/1.0 (+https://example.test/rss)'}),
        });

        const [, init] = fetchMock.mock.calls[0] as FetchCall;
        expect(init.headers['user-agent']).toBe(UMAMI_COLLECTOR_USER_AGENT);
        expect(init.headers['user-agent']).not.toContain('PodcatcherBot');
    });

    test('omits title from event data when not provided', async () => {
        vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', 'site-123');
        const fetchMock = mockFetchOk();

        await sendPodcastDownloadEvent({slug: 'ep-2', request: makeRequest({'user-agent': 'X'})});

        const [, init] = fetchMock.mock.calls[0] as FetchCall;
        expect(JSON.parse(init.body).payload.data).toEqual({slug: 'ep-2'});
    });

    test('falls back to a non-empty User-Agent when the request has none', async () => {
        vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', 'site-123');
        const fetchMock = mockFetchOk();

        await sendPodcastDownloadEvent({slug: 'ep-3', request: makeRequest()});

        const [, init] = fetchMock.mock.calls[0] as FetchCall;
        expect(typeof init.headers['user-agent']).toBe('string');
        expect(init.headers['user-agent'].length).toBeGreaterThan(0);
    });

    test('omits x-forwarded-for when the client IP is unknown', async () => {
        vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', 'site-123');
        const fetchMock = mockFetchOk();

        await sendPodcastDownloadEvent({slug: 'ep-4', request: makeRequest({'user-agent': 'X'})});

        const [, init] = fetchMock.mock.calls[0] as FetchCall;
        expect('x-forwarded-for' in init.headers).toBe(false);
    });

    test('defaults to the production Umami host when NEXT_PUBLIC_UMAMI_URL is unset', async () => {
        vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', 'site-123');
        vi.stubEnv('NEXT_PUBLIC_UMAMI_URL', undefined);
        const fetchMock = mockFetchOk();

        await sendPodcastDownloadEvent({slug: 'ep-5', request: makeRequest({'user-agent': 'X'})});

        const [url] = fetchMock.mock.calls[0] as FetchCall;
        expect(url).toBe('https://umami.m10z.de/api/send');
    });

    test('never throws when the network request fails', async () => {
        vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', 'site-123');
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

        await expect(
            sendPodcastDownloadEvent({slug: 'ep-6', request: makeRequest({'user-agent': 'X'})}),
        ).resolves.toBeUndefined();
    });
});
