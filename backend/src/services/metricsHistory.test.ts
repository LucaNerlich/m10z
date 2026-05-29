import {describe, expect, test} from 'vitest';

import {filterAndLimitMetrics, type MetricsHistoryEntry} from './metricsHistory';

function entry(updatedAt: string): MetricsHistoryEntry {
    return {updatedAt};
}

describe('filterAndLimitMetrics', () => {
    test('returns all entries (newest-first order preserved) within the default limit', () => {
        const entries = [entry('2026-04-20T00:00:00.000Z'), entry('2026-04-19T00:00:00.000Z')];
        expect(filterAndLimitMetrics(entries)).toEqual(entries);
    });

    test('applies an inclusive from/to date range', () => {
        const entries = [
            entry('2026-04-22T00:00:00.000Z'),
            entry('2026-04-20T00:00:00.000Z'),
            entry('2026-04-18T00:00:00.000Z'),
        ];
        const result = filterAndLimitMetrics(entries, {
            from: '2026-04-19T00:00:00.000Z',
            to: '2026-04-21T00:00:00.000Z',
        });
        expect(result).toEqual([entry('2026-04-20T00:00:00.000Z')]);
    });

    test('drops entries with an unparseable updatedAt', () => {
        const entries = [entry('not-a-date'), entry('2026-04-20T00:00:00.000Z')];
        expect(filterAndLimitMetrics(entries)).toEqual([entry('2026-04-20T00:00:00.000Z')]);
    });

    test('caps the result at the normalized limit', () => {
        const entries = Array.from({length: 5}, (_, i) => entry(`2026-04-${10 + i}T00:00:00.000Z`));
        expect(filterAndLimitMetrics(entries, {limit: 2})).toHaveLength(2);
    });

    test('falls back to the default limit for non-positive or non-finite values', () => {
        const entries = Array.from({length: 40}, (_, i) => entry(`2026-04-20T00:00:${String(i).padStart(2, '0')}.000Z`));
        expect(filterAndLimitMetrics(entries, {limit: 0})).toHaveLength(30);
        expect(filterAndLimitMetrics(entries, {limit: Number.NaN})).toHaveLength(30);
    });

    test('caps the limit at maxLimit', () => {
        const entries = Array.from({length: 10}, (_, i) => entry(`2026-04-20T00:00:${String(i).padStart(2, '0')}.000Z`));
        expect(filterAndLimitMetrics(entries, {limit: 1000, maxLimit: 5})).toHaveLength(5);
    });

    test('ignores invalid from/to bounds', () => {
        const entries = [entry('2026-04-20T00:00:00.000Z')];
        expect(filterAndLimitMetrics(entries, {from: 'bogus', to: 'also-bogus'})).toEqual(entries);
    });
});
