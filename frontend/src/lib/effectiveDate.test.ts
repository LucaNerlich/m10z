import {describe, expect, test} from 'vitest';

import {getEffectiveDate, sortByDateDesc, toDateTimestamp} from './effectiveDate';

describe('getEffectiveDate', () => {
    test('prefers `date` over `publishedAt`', () => {
        expect(getEffectiveDate({date: '2024-01-01', publishedAt: '2025-01-01'})).toBe('2024-01-01');
    });

    test('falls through to publishedAt when date is missing', () => {
        expect(getEffectiveDate({publishedAt: '2025-01-01'})).toBe('2025-01-01');
    });

    test('returns null when both fields are missing or empty', () => {
        expect(getEffectiveDate({})).toBeNull();
        expect(getEffectiveDate({date: '', publishedAt: ''})).toBeNull();
        expect(getEffectiveDate({date: '   ', publishedAt: '   '})).toBeNull();
    });

    test('treats null/undefined item as null', () => {
        expect(getEffectiveDate(null)).toBeNull();
        expect(getEffectiveDate(undefined)).toBeNull();
    });
});

describe('toDateTimestamp', () => {
    test('valid ISO → numeric timestamp', () => {
        expect(toDateTimestamp('2024-01-01T00:00:00Z')).toBe(Date.UTC(2024, 0, 1));
    });

    test('invalid string → null', () => {
        expect(toDateTimestamp('not-a-date')).toBeNull();
    });

    test('null/undefined/empty → null', () => {
        expect(toDateTimestamp(null)).toBeNull();
        expect(toDateTimestamp(undefined)).toBeNull();
        expect(toDateTimestamp('')).toBeNull();
    });
});

describe('sortByDateDesc', () => {
    test('returns a new array (does not mutate input)', () => {
        const items = [{date: '2024-01-01'}, {date: '2025-01-01'}];
        const result = sortByDateDesc(items);
        expect(result).not.toBe(items);
        expect(items.map((i) => i.date)).toEqual(['2024-01-01', '2025-01-01']);
    });

    test('sorts newest first', () => {
        const items = [
            {date: '2024-01-01'},
            {date: '2025-06-15'},
            {date: '2023-12-31'},
        ];
        expect(sortByDateDesc(items).map((i) => i.date)).toEqual(['2025-06-15', '2024-01-01', '2023-12-31']);
    });

    test('items missing dates sort to the end (treated as 0)', () => {
        const items = [{date: '2024-01-01'}, {}, {date: '2025-01-01'}];
        const sorted = sortByDateDesc(items);
        expect(sorted[0]).toEqual({date: '2025-01-01'});
        expect(sorted[1]).toEqual({date: '2024-01-01'});
        expect(sorted[2]).toEqual({});
    });
});
