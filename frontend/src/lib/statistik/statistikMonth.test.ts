import {describe, expect, it} from 'vitest';

import {
    adjacentMonths,
    isFutureMonth,
    isInMonth,
    monthQueryWindow,
    monthsWithContent,
    parseMonthParam,
} from './statistikMonth';
import {type StatistikHeatmap} from './types';

function cell(month: string, total: number, inRange = true) {
    return {month, articles: total, podcasts: 0, total, inRange};
}

const heatmap: StatistikHeatmap = {
    rows: [
        {year: 2023, cells: [cell('2023-11', 0, false), cell('2023-12', 3)], total: 3},
        {year: 2024, cells: [cell('2024-01', 0), cell('2024-02', 2), cell('2024-03', 1)], total: 3},
    ],
    monthTotals: [],
    maxCell: 3,
};

describe('parseMonthParam', () => {
    it('accepts YYYY-MM', () => {
        expect(parseMonthParam('2026-03')).toEqual({key: '2026-03', year: 2026, month: 3});
    });

    it.each(['2026-3', '2026-13', '2026-00', '26-03', '2026-03-01', '1999-12', '../etc', '', null, undefined])(
        'rejects %s',
        (raw) => {
            expect(parseMonthParam(raw)).toBeNull();
        }
    );
});

describe('isFutureMonth', () => {
    const now = new Date('2026-09-25T12:00:00Z');

    it('treats the current and past months as not in the future', () => {
        expect(isFutureMonth({key: '2026-09', year: 2026, month: 9}, now)).toBe(false);
        expect(isFutureMonth({key: '2025-12', year: 2025, month: 12}, now)).toBe(false);
    });

    it('flags later months', () => {
        expect(isFutureMonth({key: '2026-10', year: 2026, month: 10}, now)).toBe(true);
        expect(isFutureMonth({key: '2027-01', year: 2027, month: 1}, now)).toBe(true);
    });

    it('uses the Berlin calendar month', () => {
        // 30 Sep 22:30 UTC is already 1 October in Berlin.
        expect(isFutureMonth({key: '2026-10', year: 2026, month: 10}, new Date('2026-09-30T22:30:00Z'))).toBe(false);
    });
});

describe('monthQueryWindow', () => {
    it('pads the calendar month by a day on each side', () => {
        expect(monthQueryWindow({key: '2024-12', year: 2024, month: 12})).toEqual({
            from: '2024-11-30T00:00:00.000Z',
            to: '2025-01-02T00:00:00.000Z',
        });
    });
});

describe('isInMonth', () => {
    const march = {key: '2024-03', year: 2024, month: 3};

    it('uses Berlin month boundaries', () => {
        // Midnight Berlin on 1 March → 29 Feb 23:00 UTC.
        expect(isInMonth({date: '2024-02-29T23:00:00.000Z'}, march)).toBe(true);
        // 31 March 22:30 UTC (CEST) is already 1 April in Berlin.
        expect(isInMonth({date: '2024-03-31T22:30:00.000Z'}, march)).toBe(false);
        expect(isInMonth({date: '2024-03-15T10:00:00.000Z'}, march)).toBe(true);
    });

    it('falls back to publishedAt and ignores missing or invalid dates', () => {
        expect(isInMonth({date: null, publishedAt: '2024-03-02T10:00:00.000Z'}, march)).toBe(true);
        expect(isInMonth({date: null, publishedAt: null}, march)).toBe(false);
        expect(isInMonth({date: 'not a date'}, march)).toBe(false);
    });
});

describe('monthsWithContent / adjacentMonths', () => {
    it('lists in-range months with releases', () => {
        expect(monthsWithContent(heatmap)).toEqual(['2023-12', '2024-02', '2024-03']);
    });

    it('skips empty months when finding neighbours', () => {
        expect(adjacentMonths(heatmap, '2024-02')).toEqual({previous: '2023-12', next: '2024-03'});
        expect(adjacentMonths(heatmap, '2024-01')).toEqual({previous: '2023-12', next: '2024-02'});
    });

    it('returns null at the edges', () => {
        expect(adjacentMonths(heatmap, '2023-12')).toEqual({previous: null, next: '2024-02'});
        expect(adjacentMonths(heatmap, '2024-03')).toEqual({previous: '2024-02', next: null});
    });
});
