import {afterEach, describe, expect, test, vi} from 'vitest';

import {
    buildPodcastDownloadPath,
    buildPodcastDownloadUrl,
    isAllowedDownloadTarget,
    isPodcastDownloadTrackingEnabled,
    normalizeClientUserAgent,
    podcastClientLabel,
    shouldRecordDownloadForRange,
} from './podcastDownload';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('buildPodcastDownloadPath', () => {
    test('builds the root-relative endpoint path', () => {
        expect(buildPodcastDownloadPath('episode-001')).toBe('/api/podcast-download/episode-001');
    });

    test('URL-encodes the slug', () => {
        expect(buildPodcastDownloadPath('a b/c')).toBe('/api/podcast-download/a%20b%2Fc');
    });
});

describe('buildPodcastDownloadUrl', () => {
    test('joins the site URL and the endpoint path', () => {
        expect(buildPodcastDownloadUrl('https://m10z.de', 'ep-1')).toBe(
            'https://m10z.de/api/podcast-download/ep-1',
        );
    });

    test('strips trailing slashes from the site URL', () => {
        expect(buildPodcastDownloadUrl('https://m10z.de///', 'ep-1')).toBe(
            'https://m10z.de/api/podcast-download/ep-1',
        );
    });
});

describe('isPodcastDownloadTrackingEnabled', () => {
    test('true only when the env var is exactly "true"', () => {
        vi.stubEnv('FEED_AUDIO_TRACKING_ENABLED', 'true');
        expect(isPodcastDownloadTrackingEnabled()).toBe(true);
    });

    test.each(['false', 'TRUE', '1', 'yes', ''])('"%s" → false', (value) => {
        vi.stubEnv('FEED_AUDIO_TRACKING_ENABLED', value);
        expect(isPodcastDownloadTrackingEnabled()).toBe(false);
    });

    test('unset → false', () => {
        vi.stubEnv('FEED_AUDIO_TRACKING_ENABLED', undefined);
        expect(isPodcastDownloadTrackingEnabled()).toBe(false);
    });
});

describe('shouldRecordDownloadForRange', () => {
    test.each([
        [null, true],
        [undefined, true],
        ['', true],
        ['bytes=0-', true],
        ['bytes=0-1023', true],
        ['bytes=0-50,100-150', true],
        ['  bytes=0-  ', true],
        ['bytes=1-', false],
        ['bytes=500-', false],
        ['bytes=1024-2047', false],
    ])('range %s → record=%s', (range, expected) => {
        expect(shouldRecordDownloadForRange(range)).toBe(expected);
    });
});

describe('normalizeClientUserAgent', () => {
    test.each([
        [null, null],
        [undefined, null],
        ['', null],
        ['   ', null],
        ['AntennaPod/3.5.0', 'AntennaPod/3.5.0'],
        ['  Overcast/1.0  ', 'Overcast/1.0'],
    ])('%s → %s', (input, expected) => {
        expect(normalizeClientUserAgent(input)).toBe(expected);
    });

    test('truncates an oversized User-Agent to 256 chars', () => {
        const long = `App/${'x'.repeat(500)}`;
        const result = normalizeClientUserAgent(long);
        expect(result).toHaveLength(256);
        expect(long.startsWith(result as string)).toBe(true);
    });
});

describe('podcastClientLabel', () => {
    test.each([
        [null, null],
        [undefined, null],
        ['', null],
        ['   ', null],
        ['AntennaPod/3.5.0', 'AntennaPod'],
        ['Overcast/1.0 (+http://overcast.fm/; iOS podcast app)', 'Overcast'],
        ['Spotify/8.9.0 iOS/17.0', 'Spotify'],
        ['AppleCoreMedia/1.0.0 (iPhone; U; CPU OS 17_0 like Mac OS X)', 'AppleCoreMedia'],
        ['Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'Mozilla'],
        ['  gPodder/3.11  ', 'gPodder'],
    ])('%s → %s', (input, expected) => {
        expect(podcastClientLabel(input)).toBe(expected);
    });
});

describe('isAllowedDownloadTarget', () => {
    const strapiOrigin = 'https://cms.m10z.de';

    test('allows a URL on the configured Strapi origin', () => {
        expect(
            isAllowedDownloadTarget('https://cms.m10z.de/uploads/ep.mp3', {strapiOrigin}),
        ).toBe(true);
    });

    test('rejects a different origin when not allowlisted', () => {
        expect(
            isAllowedDownloadTarget('https://evil.example/uploads/ep.mp3', {strapiOrigin}),
        ).toBe(false);
    });

    test('rejects a protocol mismatch against the Strapi origin (http vs https)', () => {
        expect(
            isAllowedDownloadTarget('http://cms.m10z.de/uploads/ep.mp3', {strapiOrigin}),
        ).toBe(false);
    });

    test('allows an HTTPS host from the allowlist', () => {
        expect(
            isAllowedDownloadTarget('https://cdn.example.net/ep.mp3', {
                strapiOrigin,
                allowedHosts: ['cdn.example.net'],
            }),
        ).toBe(true);
    });

    test('allowlist matching is case-insensitive and trims entries', () => {
        expect(
            isAllowedDownloadTarget('https://cdn.example.net/ep.mp3', {
                strapiOrigin,
                allowedHosts: ['  CDN.Example.NET '],
            }),
        ).toBe(true);
    });

    test('rejects an allowlisted host over plain HTTP', () => {
        expect(
            isAllowedDownloadTarget('http://cdn.example.net/ep.mp3', {
                strapiOrigin,
                allowedHosts: ['cdn.example.net'],
            }),
        ).toBe(false);
    });

    test('rejects a malformed URL', () => {
        expect(isAllowedDownloadTarget('not a url', {strapiOrigin})).toBe(false);
    });

    test('rejects everything when no origin or allowlist is configured', () => {
        expect(isAllowedDownloadTarget('https://cms.m10z.de/uploads/ep.mp3', {})).toBe(false);
    });
});
