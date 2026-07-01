import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {type StrapiPodcast} from '@/src/lib/strapi/contentTypes';
import {GET} from '@/app/api/podcast-download/[slug]/route';

const mocks = vi.hoisted(() => ({
    afterCallbacks: [] as Array<() => void | Promise<void>>,
    fetchPodcastBySlug: vi.fn(),
    sendPodcastDownloadEvent: vi.fn(),
}));

vi.mock('next/server', async (importOriginal) => {
    const actual = await importOriginal<typeof import('next/server')>();
    return {
        ...actual,
        after: vi.fn((callback: () => void | Promise<void>) => {
            mocks.afterCallbacks.push(callback);
        }),
    };
});

vi.mock('@/src/lib/strapiContent', () => ({
    fetchPodcastBySlug: mocks.fetchPodcastBySlug,
}));

vi.mock('@/src/lib/analytics/umamiServer', () => ({
    sendPodcastDownloadEvent: mocks.sendPodcastDownloadEvent,
}));

function makePodcast(overrides: Partial<StrapiPodcast> = {}): StrapiPodcast {
    return {
        id: 1,
        slug: 'ep-1',
        title: 'Episode 1',
        description: 'Episode description',
        publishedAt: '2026-06-01T10:00:00.000Z',
        date: null,
        duration: 123,
        shownotes: 'Shownotes',
        file: {url: 'https://cms.m10z.de/uploads/ep-1.mp3', mime: 'audio/mpeg'},
        cover: null,
        banner: null,
        categories: [],
        authors: [],
        ...overrides,
    };
}

function makeContext(slug: string) {
    return {params: Promise.resolve({slug})};
}

beforeEach(() => {
    vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de');
    vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', 'https://cms.m10z.de');
    // Tracking is gated in the route behind this flag; enable it for the tracking-scheduling tests.
    vi.stubEnv('FEED_AUDIO_TRACKING_ENABLED', 'true');
    mocks.afterCallbacks = [];
    mocks.fetchPodcastBySlug.mockReset();
    mocks.sendPodcastDownloadEvent.mockReset();
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('podcast download route', () => {
    test('redirects to the podcast file and schedules tracking for an initial request', async () => {
        const podcast = makePodcast();
        mocks.fetchPodcastBySlug.mockResolvedValue(podcast);
        const request = new Request('https://m10z.de/api/podcast-download/ep-1', {
            headers: {'user-agent': 'PodcatcherApp/1.0'},
        });

        const response = await GET(request, makeContext('ep-1'));

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('https://cms.m10z.de/uploads/ep-1.mp3');
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(mocks.fetchPodcastBySlug).toHaveBeenCalledWith('ep-1');
        expect(mocks.afterCallbacks).toHaveLength(1);

        await mocks.afterCallbacks[0]();

        expect(mocks.sendPodcastDownloadEvent).toHaveBeenCalledWith({
            slug: 'ep-1',
            title: 'Episode 1',
            request,
        });
    });

    test('returns 404 without lookup for an invalid slug', async () => {
        const response = await GET(
            new Request('https://m10z.de/api/podcast-download/../secret'),
            makeContext('../secret'),
        );

        expect(response.status).toBe(404);
        expect(mocks.fetchPodcastBySlug).not.toHaveBeenCalled();
        expect(mocks.afterCallbacks).toHaveLength(0);
    });

    test('returns 404 when the podcast is unknown', async () => {
        mocks.fetchPodcastBySlug.mockResolvedValue(null);

        const response = await GET(
            new Request('https://m10z.de/api/podcast-download/missing-episode'),
            makeContext('missing-episode'),
        );

        expect(response.status).toBe(404);
        expect(mocks.afterCallbacks).toHaveLength(0);
    });

    test('schedules tracking for a range request starting at byte 0', async () => {
        mocks.fetchPodcastBySlug.mockResolvedValue(makePodcast());

        const response = await GET(
            new Request('https://m10z.de/api/podcast-download/ep-1', {
                headers: {range: 'bytes=0-1023'},
            }),
            makeContext('ep-1'),
        );

        expect(response.status).toBe(302);
        expect(mocks.afterCallbacks).toHaveLength(1);
    });

    test('does not schedule tracking for continuation range requests', async () => {
        mocks.fetchPodcastBySlug.mockResolvedValue(makePodcast());

        const response = await GET(
            new Request('https://m10z.de/api/podcast-download/ep-1', {
                headers: {range: 'bytes=1-'},
            }),
            makeContext('ep-1'),
        );

        expect(response.status).toBe(302);
        expect(mocks.afterCallbacks).toHaveLength(0);
    });

    test('still redirects but does not track when FEED_AUDIO_TRACKING_ENABLED is off', async () => {
        vi.stubEnv('FEED_AUDIO_TRACKING_ENABLED', 'false');
        mocks.fetchPodcastBySlug.mockResolvedValue(makePodcast());

        const response = await GET(
            new Request('https://m10z.de/api/podcast-download/ep-1', {
                headers: {'user-agent': 'PodcatcherApp/1.0'},
            }),
            makeContext('ep-1'),
        );

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('https://cms.m10z.de/uploads/ep-1.mp3');
        expect(mocks.afterCallbacks).toHaveLength(0);
        expect(mocks.sendPodcastDownloadEvent).not.toHaveBeenCalled();
    });
});
