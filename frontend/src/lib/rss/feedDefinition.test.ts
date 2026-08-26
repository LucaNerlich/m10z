import {describe, expect, test} from 'vitest';

import {sortByDateDesc} from '@/src/lib/effectiveDate';
import {buildFeedEtagSeed, latestPublishedDate, resolveChannelImageUrl} from './feedDefinition';

describe('buildFeedEtagSeed', () => {
    test('formats count and ISO date', () => {
        const date = new Date('2026-01-15T10:00:00.000Z');
        expect(buildFeedEtagSeed(5, date)).toBe('5:2026-01-15T10:00:00.000Z');
    });

    test('falls back to "none" when there is no latest date', () => {
        expect(buildFeedEtagSeed(0, null)).toBe('0:none');
    });
});

describe('latestPublishedDate', () => {
    test('returns the newest item date from a newest-first sorted list', () => {
        const sorted = sortByDateDesc([
            {title: 'old', date: '2026-01-01', publishedAt: null},
            {title: 'new', date: '2026-03-02', publishedAt: null},
        ]);
        expect(latestPublishedDate(sorted)?.toISOString()).toBe('2026-03-02T00:00:00.000Z');
    });

    test('falls back to publishedAt when date is missing', () => {
        const sorted = sortByDateDesc([{title: 'a', publishedAt: '2026-02-02T00:00:00.000Z'}]);
        expect(latestPublishedDate(sorted)?.toISOString()).toBe('2026-02-02T00:00:00.000Z');
    });

    test('returns null for an empty list', () => {
        expect(latestPublishedDate([])).toBeNull();
    });
});

describe('resolveChannelImageUrl', () => {
    test('returns the absolute channel image URL when present', () => {
        expect(
            resolveChannelImageUrl({url: 'https://cdn.example.test/feed.jpg'}, 'https://m10z.de', '/fallback.jpg'),
        ).toBe('https://cdn.example.test/feed.jpg');
    });

    test('falls back to the on-site path when the channel has no image', () => {
        expect(resolveChannelImageUrl(null, 'https://m10z.de', '/fallback.jpg')).toBe(
            'https://m10z.de/fallback.jpg',
        );
        expect(resolveChannelImageUrl({}, 'https://m10z.de/', '/fallback.jpg')).toBe(
            'https://m10z.de/fallback.jpg',
        );
    });
});
