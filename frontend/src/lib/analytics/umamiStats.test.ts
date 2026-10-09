import {describe, expect, test} from 'vitest';

import {
    ARTICLE_PATH_FILTER,
    PODCAST_DOWNLOAD_EVENT,
    SLUG_PROPERTY,
    buildArticleStatsUrl,
    buildEventValuesUrl,
    buildLoginUrl,
    buildStatsUrl,
    getPublicRangeBounds,
    normalizeCount,
    normalizeUmamiHost,
    normalizeWebsiteId,
    parseStatsPayload,
    readUmamiStatsConfig,
    sumEventTotals,
    toTopPodcastDownloads,
} from './umamiStats';

const NOW = Date.UTC(2026, 8, 7, 12, 0, 0);
const DAY_MS = 24 * 60 * 60 * 1000;

describe('getPublicRangeBounds', () => {
    test('computes an exact 30-day window', () => {
        expect(getPublicRangeBounds(NOW)).toEqual({
            '30d': {startAt: NOW - 30 * DAY_MS, endAt: NOW},
        });
    });
});

describe('normalizeUmamiHost', () => {
    test('accepts HTTPS origins and strips trailing slashes and whitespace', () => {
        expect(normalizeUmamiHost('https://umami.m10z.de///')).toBe('https://umami.m10z.de');
        expect(normalizeUmamiHost('  https://umami.m10z.de  ')).toBe('https://umami.m10z.de');
    });

    test('rejects HTTP, missing protocols, other schemes, and non-strings', () => {
        expect(normalizeUmamiHost('http://umami.m10z.de')).toBeNull();
        expect(normalizeUmamiHost('umami.m10z.de')).toBeNull();
        expect(normalizeUmamiHost('ftp://umami.m10z.de')).toBeNull();
        expect(normalizeUmamiHost('https://')).toBeNull();
        expect(normalizeUmamiHost('')).toBeNull();
        expect(normalizeUmamiHost(null)).toBeNull();
        expect(normalizeUmamiHost(undefined)).toBeNull();
    });

    test('rejects non-root paths and query/hash (SSRF surface)', () => {
        expect(normalizeUmamiHost('https://umami.m10z.de/analytics')).toBeNull();
        expect(normalizeUmamiHost('https://umami.m10z.de/?tenant=m10z')).toBeNull();
        expect(normalizeUmamiHost('https://umami.m10z.de/#frag')).toBeNull();
    });
});

describe('normalizeWebsiteId', () => {
    test('accepts UUID-like ids', () => {
        expect(normalizeWebsiteId('d50684e5-563c-416c-a439-8e9234e5b756')).toBe(
            'd50684e5-563c-416c-a439-8e9234e5b756'
        );
    });

    test('rejects empty, path-like, and oversized values', () => {
        expect(normalizeWebsiteId('')).toBeNull();
        expect(normalizeWebsiteId('  ')).toBeNull();
        expect(normalizeWebsiteId('../etc')).toBeNull();
        expect(normalizeWebsiteId('a/b')).toBeNull();
        expect(normalizeWebsiteId(null)).toBeNull();
    });
});

describe('readUmamiStatsConfig', () => {
    const full = {
        UMAMI_HOST: 'https://umami.m10z.de/',
        UMAMI_USERNAME: ' analytics ',
        UMAMI_PASSWORD: 's3cret',
        UMAMI_WEBSITE_ID: ' site-1 ',
    };

    test('returns a normalized config when all vars are set', () => {
        expect(readUmamiStatsConfig(full)).toEqual({
            ok: true,
            value: {
                host: 'https://umami.m10z.de',
                username: 'analytics',
                password: 's3cret',
                websiteId: 'site-1',
            },
        });
    });

    test('falls back to NEXT_PUBLIC_UMAMI_WEBSITE_ID when server id is unset', () => {
        const result = readUmamiStatsConfig({
            UMAMI_HOST: 'https://umami.m10z.de',
            UMAMI_USERNAME: 'analytics',
            UMAMI_PASSWORD: 's3cret',
            NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'd50684e5-563c-416c-a439-8e9234e5b756',
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.websiteId).toBe('d50684e5-563c-416c-a439-8e9234e5b756');
        }
    });

    test('reports every missing variable without leaking values', () => {
        const result = readUmamiStatsConfig({});
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.missing).toEqual(['UMAMI_HOST', 'UMAMI_USERNAME', 'UMAMI_PASSWORD', 'UMAMI_WEBSITE_ID']);
            expect(JSON.stringify(result)).not.toContain('s3cret');
        }
    });

    test('treats blank values as missing', () => {
        const result = readUmamiStatsConfig({
            UMAMI_HOST: 'not-a-url',
            UMAMI_USERNAME: '   ',
            UMAMI_PASSWORD: '',
            UMAMI_WEBSITE_ID: '',
        });
        expect(result).toEqual({
            ok: false,
            missing: ['UMAMI_HOST', 'UMAMI_USERNAME', 'UMAMI_PASSWORD', 'UMAMI_WEBSITE_ID'],
        });
    });
});

describe('URL builders', () => {
    const config = {host: 'https://umami.m10z.de', websiteId: 'site-1'};

    test('buildStatsUrl targets the website stats endpoint', () => {
        expect(buildStatsUrl(config, 1000, 2000)).toBe(
            'https://umami.m10z.de/api/websites/site-1/stats?startAt=1000&endAt=2000'
        );
    });

    test('buildArticleStatsUrl filters pageviews to article paths', () => {
        const url = new URL(buildArticleStatsUrl(config, 1000, 2000));
        expect(url.pathname).toBe('/api/websites/site-1/stats');
        expect(url.searchParams.get('path')).toBe(ARTICLE_PATH_FILTER);
        expect(url.searchParams.get('eventType')).toBe('1');
        expect(url.searchParams.get('startAt')).toBe('1000');
    });

    test('buildEventValuesUrl filters the podcast-download slug property', () => {
        expect(buildEventValuesUrl(config, 1000, 2000)).toBe(
            `https://umami.m10z.de/api/websites/site-1/event-data/values?startAt=1000&endAt=2000&event=${PODCAST_DOWNLOAD_EVENT}&propertyName=${SLUG_PROPERTY}`
        );
    });

    test('buildLoginUrl targets the same API root as statistics requests', () => {
        expect(buildLoginUrl(config)).toBe('https://umami.m10z.de/api/auth/login');
    });

    test('encodes website ids safely', () => {
        expect(buildStatsUrl({host: 'https://umami.m10z.de', websiteId: 'a_b-c'}, 1, 2)).toContain(
            '/api/websites/a_b-c/stats'
        );
    });
});

describe('normalizeCount / parseStatsPayload', () => {
    test('passes through non-negative integers and floors floats', () => {
        expect(normalizeCount(5)).toBe(5);
        expect(normalizeCount(5.9)).toBe(5);
        expect(normalizeCount('42')).toBe(42);
    });

    test('reads modern Umami {value, prev} metric objects', () => {
        expect(normalizeCount({value: 3018, prev: 3508})).toBe(3018);
        expect(normalizeCount({value: '42', prev: 1})).toBe(42);
        expect(normalizeCount({value: -3, prev: 9})).toBe(0);
        expect(normalizeCount({prev: 9})).toBe(0);
    });

    test('maps garbage to zero', () => {
        expect(normalizeCount(-1)).toBe(0);
        expect(normalizeCount(NaN)).toBe(0);
        expect(normalizeCount('abc')).toBe(0);
        expect(normalizeCount(null)).toBe(0);
        expect(normalizeCount(undefined)).toBe(0);
        expect(normalizeCount(Infinity)).toBe(0);
    });

    test('parseStatsPayload reads Umami counter fields', () => {
        expect(parseStatsPayload({pageviews: 10, visitors: '4', visits: 5.9, bounces: 1})).toEqual({
            pageviews: 10,
            visitors: 4,
            visits: 5,
        });
        expect(
            parseStatsPayload({
                pageviews: {value: 3018, prev: 3508},
                visitors: {value: 100, prev: 120},
                visits: {value: 140, prev: 160},
            })
        ).toEqual({pageviews: 3018, visitors: 100, visits: 140});
        expect(parseStatsPayload(null)).toEqual({pageviews: 0, visitors: 0, visits: 0});
    });
});

describe('podcast download events', () => {
    const rows = [
        {value: 'ep-b', total: 5},
        {value: 'ep-a', total: 12},
        {value: '  ', total: 99},
        {value: '../etc', total: 40},
        {value: 'ep-c', total: '3'},
    ];

    test('sums only rows with a valid slug', () => {
        expect(sumEventTotals(rows)).toBe(20);
        expect(sumEventTotals(null)).toBe(0);
    });

    test('lists the top episodes and drops invalid slugs', () => {
        expect(toTopPodcastDownloads(rows, 2)).toEqual([
            {slug: 'ep-a', downloads: 12},
            {slug: 'ep-b', downloads: 5},
        ]);
    });
});
