import {describe, expect, it} from 'vitest';

import {buildStatistikDashboard, bucketize, toCalendarParts, WORD_BUCKETS} from './statistikStats';
import {type StatistikSnapshot} from './types';

function makeSnapshot(overrides: Partial<StatistikSnapshot> = {}): StatistikSnapshot {
    return {
        version: 1,
        generatedAt: '2024-03-15T10:00:00.000Z',
        authors: [
            {slug: 'anna', name: 'Anna'},
            {slug: 'ben', name: 'Ben'},
            {slug: 'ghost', name: 'Ghost'},
        ],
        categories: [
            {slug: 'games', name: 'Games'},
            {slug: 'tech', name: 'Tech'},
        ],
        articles: [
            // Midnight Berlin on 1 Jan 2023 → stored as 31 Dec 2022 UTC.
            {slug: 'a1', title: 'Erster', date: '2022-12-31T23:00:00.000Z', wordCount: 800, authors: ['anna'], categories: ['games']},
            {slug: 'a2', title: 'Zweiter', date: '2023-01-20T10:00:00.000Z', wordCount: 5200, authors: ['anna', 'ben'], categories: ['games', 'tech']},
            {slug: 'a3', title: 'Dritter', date: '2023-04-10T10:00:00.000Z', wordCount: null, authors: [], categories: []},
        ],
        podcasts: [
            {slug: 'p1', title: 'Folge 1', date: '2023-01-05T18:00:00.000Z', duration: 3600, authors: ['ben'], categories: ['games']},
            {slug: 'p2', title: 'Folge 2', date: '2023-02-02T18:00:00.000Z', duration: 5400, authors: ['ben'], categories: []},
            {slug: 'p3', title: 'Folge 3', date: '2024-02-01T18:00:00.000Z', duration: 1200, authors: ['anna'], categories: ['tech']},
        ],
        ...overrides,
    };
}

describe('toCalendarParts', () => {
    it('uses Europe/Berlin calendar days', () => {
        expect(toCalendarParts('2022-12-31T23:00:00.000Z')).toEqual({year: 2023, month: 1, day: 1, weekday: 6});
        // Summer time: 22:00 UTC is midnight Berlin.
        expect(toCalendarParts('2023-06-30T22:00:00.000Z')).toMatchObject({year: 2023, month: 7, day: 1});
    });
});

describe('bucketize', () => {
    it('assigns values to half-open ranges', () => {
        const buckets = bucketize([0, 499, 500, 999, 1000, 5000, 12000], WORD_BUCKETS);
        expect(buckets.map((bucket) => bucket.count)).toEqual([2, 2, 1, 0, 0, 2]);
    });
});

describe('buildStatistikDashboard', () => {
    const dashboard = buildStatistikDashboard(makeSnapshot());

    it('computes totals', () => {
        expect(dashboard.totals).toEqual({
            articles: 3,
            podcasts: 3,
            total: 6,
            articleWords: 6000,
            avgWordsPerArticle: 3000,
            podcastSeconds: 10200,
            avgPodcastSeconds: 3400,
            activeAuthors: 2,
            activeCategories: 2,
            firstReleaseDate: '2022-12-31T23:00:00.000Z',
            latestReleaseDate: '2024-02-01T18:00:00.000Z',
            // 6 releases over Jan 2023 … Feb 2024 (14 months).
            avgReleasesPerMonth: 0.4,
        });
    });

    it('builds a contiguous year list with per-year sums', () => {
        expect(dashboard.years).toEqual([
            {year: 2023, articles: 3, podcasts: 2, total: 5, articleWords: 6000, podcastSeconds: 9000},
            {year: 2024, articles: 0, podcasts: 1, total: 1, articleWords: 0, podcastSeconds: 1200},
        ]);
    });

    it('builds the monthly heatmap with range flags', () => {
        expect(dashboard.heatmap.rows).toHaveLength(2);
        const [row2023, row2024] = dashboard.heatmap.rows;
        expect(row2023.cells[0]).toEqual({month: '2023-01', articles: 2, podcasts: 1, total: 3, inRange: true});
        expect(row2023.cells[1].total).toBe(1);
        expect(row2023.cells[3].total).toBe(1);
        // Snapshot taken in March 2024 → April 2024 onward is out of range.
        expect(row2024.cells[2].inRange).toBe(true);
        expect(row2024.cells[3].inRange).toBe(false);
        expect(dashboard.heatmap.maxCell).toBe(3);
        expect(dashboard.heatmap.monthTotals).toEqual([3, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
    });

    it('accumulates releases month by month up to the snapshot month', () => {
        expect(dashboard.cumulative[0]).toEqual({month: '2023-01', articles: 2, podcasts: 1, total: 3});
        expect(dashboard.cumulative.at(-1)).toEqual({month: '2024-03', articles: 3, podcasts: 3, total: 6});
        expect(dashboard.cumulative).toHaveLength(15);
    });

    it('counts weekdays Monday-first', () => {
        expect(dashboard.weekdays).toHaveLength(7);
        expect(dashboard.weekdays.reduce((sum, day) => sum + day.total, 0)).toBe(6);
        // 1 Jan 2023 was a Sunday.
        expect(dashboard.weekdays[6].articles).toBe(1);
    });

    it('ranks the longest articles and podcasts, ignoring missing values', () => {
        expect(dashboard.longestArticles.map((entry) => entry.slug)).toEqual(['a2', 'a1']);
        expect(dashboard.longestPodcasts.map((entry) => [entry.slug, entry.value])).toEqual([
            ['p2', 5400],
            ['p1', 3600],
            ['p3', 1200],
        ]);
    });

    it('breaks down authors and categories, dropping inactive ones', () => {
        expect(dashboard.authors).toEqual([
            {slug: 'anna', name: 'Anna', articles: 2, podcasts: 1, total: 3},
            {slug: 'ben', name: 'Ben', articles: 1, podcasts: 2, total: 3},
        ]);
        expect(dashboard.categories.map((entry) => [entry.slug, entry.total])).toEqual([
            ['games', 3],
            ['tech', 2],
        ]);
    });

    it('derives records', () => {
        expect(dashboard.records.busiestMonth).toEqual({month: '2023-01', total: 3});
        expect(dashboard.records.busiestYear).toEqual({year: 2023, total: 5});
        expect(dashboard.records.longestGap).toEqual({
            days: 297,
            from: '2023-04-10T10:00:00.000Z',
            to: '2024-02-01T18:00:00.000Z',
        });
        expect(dashboard.records.longestMonthStreak).toEqual({months: 2, from: '2023-01', to: '2023-02'});
    });

    it('handles an empty snapshot', () => {
        const empty = buildStatistikDashboard(makeSnapshot({articles: [], podcasts: []}));
        expect(empty.totals.total).toBe(0);
        expect(empty.totals.firstReleaseDate).toBeNull();
        expect(empty.totals.avgReleasesPerMonth).toBe(0);
        expect(empty.heatmap.rows).toEqual([]);
        expect(empty.cumulative).toEqual([]);
        expect(empty.records).toEqual({busiestMonth: null, busiestYear: null, longestGap: null, longestMonthStreak: null});
    });

    it('drops excluded releases from every figure', () => {
        const filtered = buildStatistikDashboard(makeSnapshot(), {articles: ['a1'], podcasts: ['p3']});
        expect(filtered.totals.articles).toBe(2);
        expect(filtered.totals.podcasts).toBe(2);
        expect(filtered.totals.firstReleaseDate).toBe('2023-01-05T18:00:00.000Z');
        expect(filtered.years.map((year) => [year.year, year.total])).toEqual([
            [2023, 4],
            [2024, 0],
        ]);
    });

    it('excludes the 2018 outlier by default', () => {
        const withOutlier = makeSnapshot({
            articles: [
                {slug: 'pyre', title: 'Pyre', date: '2018-12-17T23:00:00.000Z', wordCount: 900, authors: [], categories: []},
                ...makeSnapshot().articles,
            ],
        });
        expect(buildStatistikDashboard(withOutlier)).toEqual(buildStatistikDashboard(makeSnapshot()));
    });
});
