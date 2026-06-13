import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const {fetchPodcastBySlug, sendPodcastDownloadEvent, isAllowedDownloadTarget, shouldRecordDownloadForRange, mediaUrlToAbsolute, normalizeStrapiMedia, getStrapiApiBaseUrl, after} =
    vi.hoisted(() => ({
        fetchPodcastBySlug: vi.fn(),
        sendPodcastDownloadEvent: vi.fn(),
        isAllowedDownloadTarget: vi.fn(),
        shouldRecordDownloadForRange: vi.fn().mockReturnValue(true),
        mediaUrlToAbsolute: vi.fn().mockReturnValue('https://cdn.example.com/ep.mp3'),
        normalizeStrapiMedia: vi.fn().mockReturnValue({}),
        getStrapiApiBaseUrl: vi.fn().mockReturnValue(new URL('https://cms.example.com')),
        after: vi.fn(),
    }));

vi.mock('next/server', async (importOriginal) => {
    const actual = await importOriginal<typeof import('next/server')>();
    return {...actual, after};
});

vi.mock('@/src/lib/strapiContent', () => ({fetchPodcastBySlug}));
vi.mock('@/src/lib/analytics/umamiServer', () => ({sendPodcastDownloadEvent}));
vi.mock('@/src/lib/analytics/podcastDownload', () => ({
    isAllowedDownloadTarget,
    shouldRecordDownloadForRange,
    buildPodcastDownloadPath: vi.fn(),
    buildPodcastDownloadUrl: vi.fn(),
    isPodcastDownloadTrackingEnabled: vi.fn(),
}));
vi.mock('@/src/lib/strapi/media', () => ({mediaUrlToAbsolute, normalizeStrapiMedia}));
vi.mock('@/src/lib/strapi', () => ({getStrapiApiBaseUrl}));

import {GET} from './route';

function makeRequest(slug: string): [Request, {params: Promise<{slug: string}>}] {
    const request = new Request(`https://m10z.de/api/podcast-download/${slug}`, {method: 'GET'});
    const context = {params: Promise.resolve({slug})};
    return [request, context];
}

beforeEach(() => {
    fetchPodcastBySlug.mockReset();
    isAllowedDownloadTarget.mockReset();
    mediaUrlToAbsolute.mockReturnValue('https://cdn.example.com/ep.mp3');
    normalizeStrapiMedia.mockReturnValue({});
    getStrapiApiBaseUrl.mockReturnValue(new URL('https://cms.example.com'));
    shouldRecordDownloadForRange.mockReturnValue(true);
    after.mockClear();
});

afterEach(() => vi.unstubAllEnvs());

describe('GET /api/podcast-download/[slug]', () => {
    test('returns 404 for an invalid slug pattern', async () => {
        const [request, context] = makeRequest('../etc');
        const res = await GET(request, context);
        expect(res.status).toBe(404);
        expect(fetchPodcastBySlug).not.toHaveBeenCalled();
    });

    test('returns 404 when Strapi returns null for the slug', async () => {
        fetchPodcastBySlug.mockResolvedValue(null);
        const [request, context] = makeRequest('valid-slug');
        const res = await GET(request, context);
        expect(res.status).toBe(404);
    });

    test('returns 404 when the resolved file URL is not on the allowlist', async () => {
        fetchPodcastBySlug.mockResolvedValue({title: 'Episode 1', file: {}});
        mediaUrlToAbsolute.mockReturnValue('https://cdn.example.com/ep.mp3');
        isAllowedDownloadTarget.mockReturnValue(false);

        const [request, context] = makeRequest('valid-slug');
        const res = await GET(request, context);
        expect(res.status).toBe(404);
    });

    test('returns 302 with Location and Cache-Control headers for a valid slug and allowed URL', async () => {
        fetchPodcastBySlug.mockResolvedValue({title: 'Episode 1', file: {}});
        mediaUrlToAbsolute.mockReturnValue('https://cdn.example.com/ep.mp3');
        isAllowedDownloadTarget.mockReturnValue(true);

        const [request, context] = makeRequest('valid-slug');
        const res = await GET(request, context);

        expect(res.status).toBe(302);
        expect(res.headers.get('Location')).toBe('https://cdn.example.com/ep.mp3');
        expect(res.headers.get('Cache-Control')).toBe('no-store');
    });
});
