import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {GET} from './route';

const {
    fetchPodcastBySlug,
    sendPodcastDownloadEvent,
    isAllowedDownloadTarget,
    shouldRecordDownloadForRange,
    shouldRecordDownloadDeduped,
    isPodcastDownloadTrackingEnabled,
    mediaUrlToAbsolute,
    normalizeStrapiMedia,
    getStrapiApiBaseUrl,
    after,
} =
    vi.hoisted(() => ({
        fetchPodcastBySlug: vi.fn(),
        sendPodcastDownloadEvent: vi.fn(),
        isAllowedDownloadTarget: vi.fn(),
        shouldRecordDownloadForRange: vi.fn().mockReturnValue(true),
        shouldRecordDownloadDeduped: vi.fn().mockReturnValue(true),
        isPodcastDownloadTrackingEnabled: vi.fn().mockReturnValue(false),
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
    shouldRecordDownloadDeduped,
    buildPodcastDownloadPath: vi.fn(),
    buildPodcastDownloadUrl: vi.fn(),
    isPodcastDownloadTrackingEnabled,
}));
vi.mock('@/src/lib/strapi/media', () => ({mediaUrlToAbsolute, normalizeStrapiMedia}));
vi.mock('@/src/lib/strapiTransport', () => ({getStrapiApiBaseUrl}));

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
    shouldRecordDownloadDeduped.mockReturnValue(true);
    isPodcastDownloadTrackingEnabled.mockReturnValue(false);
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

    test('returns 404 for a slug that still contains dots after stripping a trailing .mp3 suffix', async () => {
        // validateSlug disallows dots, so an embedded dot must still be rejected even though the
        // trailing ".mp3" is stripped first.
        const [request, context] = makeRequest('valid.slug.mp3');
        const res = await GET(request, context);
        expect(res.status).toBe(404);
        expect(fetchPodcastBySlug).not.toHaveBeenCalled();
    });

    test('returns 404 when Strapi returns null for the slug', async () => {
        fetchPodcastBySlug.mockResolvedValue(null);
        const [request, context] = makeRequest('valid-slug.mp3');
        const res = await GET(request, context);
        expect(res.status).toBe(404);
        expect(fetchPodcastBySlug).toHaveBeenCalledWith('valid-slug');
    });

    test('returns 404 when the resolved file URL is not on the allowlist', async () => {
        fetchPodcastBySlug.mockResolvedValue({title: 'Episode 1', file: {}});
        mediaUrlToAbsolute.mockReturnValue('https://cdn.example.com/ep.mp3');
        isAllowedDownloadTarget.mockReturnValue(false);

        const [request, context] = makeRequest('valid-slug.mp3');
        const res = await GET(request, context);
        expect(res.status).toBe(404);
    });

    test('returns 302 with Location and Cache-Control headers for a .mp3-suffixed inbound slug', async () => {
        fetchPodcastBySlug.mockResolvedValue({title: 'Episode 1', file: {}});
        mediaUrlToAbsolute.mockReturnValue('https://cdn.example.com/ep.mp3');
        isAllowedDownloadTarget.mockReturnValue(true);

        const [request, context] = makeRequest('valid-slug.mp3');
        const res = await GET(request, context);

        expect(res.status).toBe(302);
        expect(res.headers.get('Location')).toBe('https://cdn.example.com/ep.mp3');
        expect(res.headers.get('Cache-Control')).toBe('no-store');
        expect(fetchPodcastBySlug).toHaveBeenCalledWith('valid-slug');
    });

    test('returns 429 after the per-client event cap, across slugs', async () => {
        fetchPodcastBySlug.mockResolvedValue({title: 'Episode 1', file: {}});
        mediaUrlToAbsolute.mockReturnValue('https://cdn.example.com/ep.mp3');
        isAllowedDownloadTarget.mockReturnValue(true);
        isPodcastDownloadTrackingEnabled.mockReturnValue(true);

        // A distinct client IP keeps this test in its own limiter bucket.
        const request = new Request('https://m10z.de/api/podcast-download/valid-slug.mp3', {
            method: 'GET',
            headers: {'x-forwarded-for': '203.0.113.77'},
        });

        // Different slugs each time: the old per-slug dedupe key would let this pass.
        for (let i = 0; i < 20; i++) {
            const res = await GET(request, {params: Promise.resolve({slug: `episode-${i}`})});
            expect(res.status).toBe(302);
        }

        const capped = await GET(request, {params: Promise.resolve({slug: 'episode-final'})});
        expect(capped.status).toBe(429);
        expect(capped.headers.get('Retry-After')).toBeTruthy();
        expect(capped.headers.get('Cache-Control')).toBe('no-store');

        // A different client is unaffected.
        const otherClient = new Request('https://m10z.de/api/podcast-download/valid-slug.mp3', {
            method: 'GET',
            headers: {'x-forwarded-for': '203.0.113.78'},
        });
        expect((await GET(otherClient, {params: Promise.resolve({slug: 'episode-final'})})).status).toBe(302);
    });

    test('does not spend the event budget on HEAD probes', async () => {
        fetchPodcastBySlug.mockResolvedValue({title: 'Episode 1', file: {}});
        mediaUrlToAbsolute.mockReturnValue('https://cdn.example.com/ep.mp3');
        isAllowedDownloadTarget.mockReturnValue(true);
        isPodcastDownloadTrackingEnabled.mockReturnValue(true);

        const head = new Request('https://m10z.de/api/podcast-download/valid-slug.mp3', {
            method: 'HEAD',
            headers: {'x-forwarded-for': '203.0.113.99'},
        });
        for (let i = 0; i < 25; i++) {
            expect((await GET(head, {params: Promise.resolve({slug: 'valid-slug'})})).status).toBe(302);
        }

        const get = new Request('https://m10z.de/api/podcast-download/valid-slug.mp3', {
            method: 'GET',
            headers: {'x-forwarded-for': '203.0.113.99'},
        });
        expect((await GET(get, {params: Promise.resolve({slug: 'valid-slug'})})).status).toBe(302);
    });

    test('strips the .mp3 suffix case-insensitively before slug validation/lookup', async () => {
        fetchPodcastBySlug.mockResolvedValue({title: 'Episode 1', file: {}});
        mediaUrlToAbsolute.mockReturnValue('https://cdn.example.com/ep.mp3');
        isAllowedDownloadTarget.mockReturnValue(true);

        const [request, context] = makeRequest('valid-slug.MP3');
        const res = await GET(request, context);

        expect(res.status).toBe(302);
        expect(fetchPodcastBySlug).toHaveBeenCalledWith('valid-slug');
    });

    test('returns 404 for a slug that is only the .mp3 suffix (empty after stripping)', async () => {
        const [request, context] = makeRequest('.mp3');
        const res = await GET(request, context);
        expect(res.status).toBe(404);
        expect(fetchPodcastBySlug).not.toHaveBeenCalled();
    });

    test('accepts a bare inbound slug with no .mp3 suffix (backward compatibility)', async () => {
        // Requests that predate the fake-suffix change, or come from a client that didn't append it,
        // must still resolve normally since the strip is a no-op when there is nothing to strip.
        fetchPodcastBySlug.mockResolvedValue({title: 'Episode 1', file: {}});
        mediaUrlToAbsolute.mockReturnValue('https://cdn.example.com/ep.mp3');
        isAllowedDownloadTarget.mockReturnValue(true);

        const [request, context] = makeRequest('valid-slug');
        const res = await GET(request, context);

        expect(res.status).toBe(302);
        expect(fetchPodcastBySlug).toHaveBeenCalledWith('valid-slug');
    });

    test('trims surrounding whitespace before the lookup', async () => {
        // validateSlug trims; the route must query the trimmed value, not the raw
        // one it validated.
        fetchPodcastBySlug.mockResolvedValue({title: 'Episode 1', file: {}});
        mediaUrlToAbsolute.mockReturnValue('https://cdn.example.com/ep.mp3');
        isAllowedDownloadTarget.mockReturnValue(true);

        const [request, context] = makeRequest(' valid-slug.mp3 ');
        context.params = Promise.resolve({slug: ' valid-slug.mp3 '});
        const res = await GET(request, context);

        expect(res.status).toBe(302);
        expect(fetchPodcastBySlug).toHaveBeenCalledWith('valid-slug');
    });

    test('accepts the underscore slugs the CMS already serves as pages', async () => {
        // Two published episodes (thaumaturge_songsofconquest, trithius_newstower) have an
        // underscore in their slug. The feed emitted their tracking URLs, but the route's
        // stricter pattern rejected them with 404.
        fetchPodcastBySlug.mockResolvedValue({title: 'Episode 1', file: {}});
        mediaUrlToAbsolute.mockReturnValue('https://cdn.example.com/ep.mp3');
        isAllowedDownloadTarget.mockReturnValue(true);

        const [request, context] = makeRequest('thaumaturge_songsofconquest.mp3');
        const res = await GET(request, context);

        expect(res.status).toBe(302);
        expect(fetchPodcastBySlug).toHaveBeenCalledWith('thaumaturge_songsofconquest');
    });

    test('only strips one trailing .mp3, so a doubled suffix is still rejected', async () => {
        // TRAILING_MP3_SUFFIX is anchored with a single `$`, so "slug.mp3.mp3" strips to
        // "slug.mp3" — which still contains a dot and must be rejected by validateSlug.
        const [request, context] = makeRequest('valid-slug.mp3.mp3');
        const res = await GET(request, context);
        expect(res.status).toBe(404);
        expect(fetchPodcastBySlug).not.toHaveBeenCalled();
    });
});
