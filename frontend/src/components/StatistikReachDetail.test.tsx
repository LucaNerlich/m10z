import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, test} from 'vitest';

import {type UmamiReachDetailStats} from '@/src/lib/analytics/umamiStats';
import {StatistikReachDetail} from './StatistikReachDetail';

const range = {
    startAt: '2026-01-01T00:00:00.000Z',
    endAt: '2026-01-31T00:00:00.000Z',
    pageviews: 10,
    visitors: 5,
    visits: 6,
};

const detail = {
    ranges: {
        '7d': {...range, articles: [], podcasts: []},
        '30d': {
            ...range,
            articles: [{slug: '__proto__', pageviews: 5}],
            podcasts: [{slug: '__proto__', downloads: 3}],
        },
        '6m': {...range, articles: [], podcasts: []},
    },
    cachedAt: '2026-01-31T00:00:00.000Z',
    // Present on the earlier layers; removed by #1108. The assertion keeps the
    // fixture valid on both sides of that stack.
    cacheTtlSeconds: 600,
} as UmamiReachDetailStats;

describe('StatistikReachDetail', () => {
    test('renders a __proto__ slug as text instead of crashing on Object.prototype', () => {
        const html = renderToStaticMarkup(
            <StatistikReachDetail
                detail={detail}
                rangeKey="30d"
                articleTitles={Object.create(null)}
                podcastTitles={Object.create(null)}
            />,
        );

        expect(html).toContain('__proto__');
    });
});
