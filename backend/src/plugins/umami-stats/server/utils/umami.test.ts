import {describe, expect, test} from 'vitest';

import {
    CACHE_TTL_MS,
    PODCAST_DOWNLOAD_EVENT,
    RANGE_KEYS,
    SLUG_PROPERTY,
    TOP_SLUGS_LIMIT,
    buildEventValuesUrl,
    buildStatsUrl,
    createAuthError,
    createConfigError,
    createUpstreamError,
    getRangeBounds,
    normalizeCount,
    normalizeHost,
    readUmamiConfig,
    sumEventTotals,
    toTopSlugs,
} from './umami';

const NOW = Date.UTC(2026, 8, 7, 12, 0, 0);
const DAY_MS = 24 * 60 * 60 * 1000;

describe('getRangeBounds', () => {
    test('computes exact day ranges for 7d and 30d', () => {
        const bounds = getRangeBounds(NOW);
        expect(Object.keys(bounds).sort()).toEqual(['30d', '6m', '7d']);
        expect(bounds['7d']).toEqual({startAt: NOW - 7 * DAY_MS, endAt: NOW});
        expect(bounds['30d']).toEqual({startAt: NOW - 30 * DAY_MS, endAt: NOW});
    });

    test('goes back 6 calendar months for 6m', () => {
        const bounds = getRangeBounds(NOW);
        expect(bounds['6m'].endAt).toBe(NOW);
        expect(new Date(bounds['6m'].startAt).toISOString()).toBe('2026-03-07T12:00:00.000Z');
    });
});

describe('normalizeHost', () => {
    test('accepts http(s) hosts and strips trailing slashes and whitespace', () => {
        expect(normalizeHost('https://umami.m10z.de///')).toBe('https://umami.m10z.de');
        expect(normalizeHost('  http://localhost:3000  ')).toBe('http://localhost:3000');
    });

    test('rejects missing protocols, other schemes, and non-strings', () => {
        expect(normalizeHost('umami.m10z.de')).toBeNull();
        expect(normalizeHost('ftp://umami.m10z.de')).toBeNull();
        expect(normalizeHost('https://')).toBeNull();
        expect(normalizeHost('')).toBeNull();
        expect(normalizeHost(null)).toBeNull();
        expect(normalizeHost(undefined)).toBeNull();
    });
});

describe('readUmamiConfig', () => {
    const full = {
        UMAMI_HOST: 'https://umami.m10z.de/',
        UMAMI_USERNAME: ' analytics ',
        UMAMI_PASSWORD: 's3cret',
        UMAMI_WEBSITE_ID: ' site-1 ',
    };

    test('returns a normalized config when all vars are set', () => {
        expect(readUmamiConfig(full)).toEqual({
            ok: true,
            value: {
                host: 'https://umami.m10z.de',
                username: 'analytics',
                password: 's3cret',
                websiteId: 'site-1',
            },
        });
    });

    test('reports every missing variable without leaking values', () => {
        const result = readUmamiConfig({});
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.missing).toEqual(['UMAMI_HOST', 'UMAMI_USERNAME', 'UMAMI_PASSWORD', 'UMAMI_WEBSITE_ID']);
            expect(JSON.stringify(result)).not.toContain('s3cret');
        }
    });

    test('treats blank values as missing', () => {
        const result = readUmamiConfig({UMAMI_HOST: 'not-a-url', UMAMI_USERNAME: '   ', UMAMI_PASSWORD: '', UMAMI_WEBSITE_ID: ''});
        expect(result).toEqual({ok: false, missing: ['UMAMI_HOST', 'UMAMI_USERNAME', 'UMAMI_PASSWORD', 'UMAMI_WEBSITE_ID']});
    });
});

describe('URL builders', () => {
    const config = {host: 'https://umami.m10z.de', websiteId: 'site-1'};

    test('buildStatsUrl targets the website stats endpoint', () => {
        expect(buildStatsUrl(config, 1000, 2000)).toBe('https://umami.m10z.de/api/websites/site-1/stats?startAt=1000&endAt=2000');
    });

    test('buildEventValuesUrl filters the podcast-download slug property', () => {
        expect(buildEventValuesUrl(config, 1000, 2000)).toBe(
            `https://umami.m10z.de/api/websites/site-1/event-data/values?startAt=1000&endAt=2000&event=${PODCAST_DOWNLOAD_EVENT}&propertyName=${SLUG_PROPERTY}`,
        );
    });

    test('encodes website ids safely', () => {
        expect(buildStatsUrl({host: 'https://umami.m10z.de', websiteId: 'a/b c'}, 1, 2)).toContain('/api/websites/a%2Fb%20c/stats');
    });
});

describe('normalizeCount', () => {
    test('passes through non-negative integers and floors floats', () => {
        expect(normalizeCount(5)).toBe(5);
        expect(normalizeCount(5.9)).toBe(5);
        expect(normalizeCount('42')).toBe(42);
    });

    test('maps garbage to zero', () => {
        expect(normalizeCount(-1)).toBe(0);
        expect(normalizeCount(NaN)).toBe(0);
        expect(normalizeCount('abc')).toBe(0);
        expect(normalizeCount(null)).toBe(0);
        expect(normalizeCount(undefined)).toBe(0);
        expect(normalizeCount(Infinity)).toBe(0);
    });
});

describe('toTopSlugs', () => {
    const rows = [
        {value: 'ep-b', total: 5},
        {value: 'ep-a', total: 12},
        {value: '  ', total: 99},
        {value: 'ep-c', total: '3'},
        {value: null, total: 7},
    ];

    test('sorts by downloads descending and skips blank values', () => {
        expect(toTopSlugs(rows, 10)).toEqual([
            {slug: 'ep-a', downloads: 12},
            {slug: 'ep-b', downloads: 5},
            {slug: 'ep-c', downloads: 3},
        ]);
    });

    test('respects the limit and defaults to TOP_SLUGS_LIMIT', () => {
        expect(toTopSlugs(rows, 2)).toHaveLength(2);
        const many = Array.from({length: TOP_SLUGS_LIMIT + 5}, (_, index) => ({value: `ep-${index}`, total: 1}));
        expect(toTopSlugs(many)).toHaveLength(TOP_SLUGS_LIMIT);
    });

    test('returns an empty list for non-array input', () => {
        expect(toTopSlugs(null)).toEqual([]);
        expect(toTopSlugs({})).toEqual([]);
    });
});

describe('sumEventTotals', () => {
    test('sums only rows with a valid slug, mirroring toTopSlugs', () => {
        expect(
            sumEventTotals([
                {value: 'ep-a', total: 12},
                {value: '', total: 99},
                {value: 'ep-b', total: 5},
            ]),
        ).toBe(17);
    });

    test('returns zero for non-array input', () => {
        expect(sumEventTotals(null)).toBe(0);
    });
});

describe('error factories', () => {
    test('carry codes and HTTP statuses for the controller mapping', () => {
        expect({...createConfigError(['UMAMI_HOST']), message: createConfigError(['UMAMI_HOST']).message}).toMatchObject({code: 'UMAMI_CONFIG', status: 503});
        expect(createAuthError()).toMatchObject({code: 'UMAMI_AUTH', status: 502});
        expect(createUpstreamError(500)).toMatchObject({code: 'UMAMI_UPSTREAM', status: 502, upstreamStatus: 500});
        expect(createUpstreamError(0)).toMatchObject({code: 'UMAMI_UPSTREAM', status: 502});
    });

    test('range constants cover the required widget ranges', () => {
        expect(RANGE_KEYS).toEqual(['7d', '30d', '6m']);
        expect(CACHE_TTL_MS).toBe(10 * 60 * 1000);
    });
});
