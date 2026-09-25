import {describe, expect, it} from 'vitest';

import {
    formatCalendarDate,
    formatHours,
    formatInteger,
    formatMinutes,
    formatMonthKey,
    formatSnapshotDate,
    pluralize,
} from './statistikFormat';
import {groupYearRuns, heatmapLevel, niceTicks} from './statistikStats';

describe('statistikFormat', () => {
    it('formats numbers the German way', () => {
        expect(formatInteger(90306)).toBe('90.306');
        expect(formatHours(545714)).toBe('151,6 Std.');
        expect(pluralize(1, 'Artikel', 'Artikel')).toBe('1 Artikel');
        expect(pluralize(2, 'Folge', 'Folgen')).toBe('2 Folgen');
    });

    it('formats durations in minutes and hours', () => {
        expect(formatMinutes(3544)).toBe('59 Min.');
        expect(formatMinutes(9534)).toBe('2 Std. 39 Min.');
        expect(formatMinutes(7200)).toBe('2 Std.');
    });

    it('formats months and Berlin calendar dates', () => {
        expect(formatMonthKey('2026-01')).toBe('Januar 2026');
        expect(formatCalendarDate('2018-12-17T23:00:00.000Z')).toBe('18. Dezember 2018');
        expect(formatSnapshotDate('2026-09-25T12:55:46.915Z')).toBe('25. September 2026, 14:55 Uhr');
    });
});

describe('groupYearRuns', () => {
    it('collapses consecutive empty years', () => {
        const runs = groupYearRuns([
            {year: 2018, total: 1},
            {year: 2019, total: 0},
            {year: 2020, total: 0},
            {year: 2021, total: 3},
            {year: 2022, total: 0},
            {year: 2023, total: 2},
        ]);
        expect(runs).toEqual([
            {kind: 'year', item: {year: 2018, total: 1}},
            {kind: 'gap', from: 2019, to: 2020},
            {kind: 'year', item: {year: 2021, total: 3}},
            {kind: 'gap', from: 2022, to: 2022},
            {kind: 'year', item: {year: 2023, total: 2}},
        ]);
    });
});

describe('heatmapLevel', () => {
    it('scales counts to 0…4', () => {
        expect(heatmapLevel(0, 24)).toBe(0);
        expect(heatmapLevel(1, 24)).toBe(1);
        expect(heatmapLevel(12, 24)).toBe(2);
        expect(heatmapLevel(13, 24)).toBe(3);
        expect(heatmapLevel(24, 24)).toBe(4);
        expect(heatmapLevel(5, 0)).toBe(0);
    });
});

describe('niceTicks', () => {
    it('produces round ticks covering the maximum', () => {
        expect(niceTicks(228)).toEqual([0, 100, 200, 300]);
        expect(niceTicks(24)).toEqual([0, 10, 20, 30]);
        expect(niceTicks(200)).toEqual([0, 50, 100, 150, 200]);
        expect(niceTicks(0)).toEqual([0]);
        expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
    });
});
