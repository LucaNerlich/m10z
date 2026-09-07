import {describe, expect, test, vi} from 'vitest';

vi.mock('@strapi/design-system', () => ({}));
vi.mock('@strapi/strapi/admin', () => ({}));

import {isDashboardPayload} from './UmamiStatsWidget';

const rangeStats = {
    startAt: '2026-08-01T00:00:00.000Z',
    endAt: '2026-09-01T00:00:00.000Z',
    pageviews: 10,
    visitors: 8,
    visits: 9,
    podcastDownloads: 2,
};

const payload = {
    ranges: {
        '7d': rangeStats,
        '30d': rangeStats,
        '6m': rangeStats,
    },
    topSlugs: {
        '7d': [],
        '30d': [{slug: 'episode-1', downloads: 2}],
        '6m': [],
    },
    cachedAt: '2026-09-01T00:00:00.000Z',
    cacheTtlSeconds: 600,
};

describe('isDashboardPayload', () => {
    test('accepts a complete dashboard response', () => {
        expect(isDashboardPayload(payload)).toBe(true);
    });

    test('rejects a dashboard response with omitted topSlugs', () => {
        const {topSlugs: _topSlugs, ...withoutTopSlugs} = payload;

        expect(isDashboardPayload(withoutTopSlugs)).toBe(false);
    });

    test('rejects malformed slug entries in any range', () => {
        expect(
            isDashboardPayload({
                ...payload,
                topSlugs: {...payload.topSlugs, '7d': [{slug: 'episode-1'}]},
            }),
        ).toBe(false);
    });
});
