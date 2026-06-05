import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {formatDateFull, formatDateRelative, formatDateShort, formatDuration} from './dateFormatters';

describe('formatDateFull', () => {
    test('plain YYYY-MM-DD → German full date', () => {
        expect(formatDateFull('2024-01-15')).toBe('15. Januar 2024');
    });

    test('ISO with low UTC hour → no day shift', () => {
        expect(formatDateFull('2024-12-25T10:00:00Z')).toBe('25. Dezember 2024');
    });

    test('ISO with late UTC hour (>=20) shifts forward by one calendar day', () => {
        // The function compensates for "midnight local time in a UTC+N timezone"
        // by adding one day when hour >= 20.
        expect(formatDateFull('2024-12-25T23:00:00Z')).toBe('26. Dezember 2024');
    });

    test('null → em dash', () => {
        expect(formatDateFull(null)).toBe('—');
    });

    test('undefined → em dash', () => {
        expect(formatDateFull(undefined)).toBe('—');
    });

    test('garbage string → em dash', () => {
        expect(formatDateFull('not-a-date')).toBe('—');
    });
});

describe('formatDateShort', () => {
    test('plain YYYY-MM-DD → German short date', () => {
        expect(formatDateShort('2024-01-15')).toBe('15. Jan. 2024');
    });

    test('March uses "März" (no period)', () => {
        expect(formatDateShort('2024-03-10')).toBe('10. März 2024');
    });

    test('null → em dash', () => {
        expect(formatDateShort(null)).toBe('—');
    });
});

describe('formatDuration', () => {
    test.each([
        [0, '0:00'],
        [5, '0:05'],
        [65, '1:05'],
        [125, '2:05'],
        [3599, '59:59'],
        [3600, '1:00:00'],
        [3665, '1:01:05'],
        [7325, '2:02:05'],
    ])('%i seconds → %s', (input, expected) => {
        expect(formatDuration(input)).toBe(expected);
    });

    test('floors fractional seconds', () => {
        expect(formatDuration(65.9)).toBe('1:05');
    });
});

describe('formatDateRelative', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Pin "now" to midnight UTC so calendar-day diffs are exact.
        vi.setSystemTime(new Date('2026-04-20T00:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('returns em dash for invalid input', () => {
        expect(formatDateRelative(null)).toBe('—');
        expect(formatDateRelative(undefined)).toBe('—');
        expect(formatDateRelative('not-a-date')).toBe('—');
    });

    test('labels today, yesterday, and tomorrow', () => {
        expect(formatDateRelative('2026-04-20')).toBe('heute');
        expect(formatDateRelative('2026-04-19')).toBe('gestern');
        expect(formatDateRelative('2026-04-21')).toBe('morgen');
    });

    test('uses day granularity within a week', () => {
        expect(formatDateRelative('2026-04-17')).toBe('vor 3 Tagen');
        expect(formatDateRelative('2026-04-23')).toBe('in 3 Tagen');
    });

    test('uses week granularity within a month', () => {
        expect(formatDateRelative('2026-04-06')).toBe('vor 2 Wochen');
    });

    test('uses month granularity within a year', () => {
        expect(formatDateRelative('2026-02-19')).toBe('vor 2 Monaten');
    });
});
