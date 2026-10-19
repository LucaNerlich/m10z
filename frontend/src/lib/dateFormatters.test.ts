import {describe, expect, test} from 'vitest';

import {formatDateShort, formatDuration} from './dateFormatters';

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

    test('shifts a whole-hour 22:00/23:00 UTC midnight-local date forward', () => {
        // 23:00Z = midnight Berlin in winter (UTC+1); 22:00Z = midnight in summer (UTC+2).
        expect(formatDateShort('2025-01-15T23:00:00.000Z')).toBe('16. Jan. 2025');
        expect(formatDateShort('2025-07-15T22:00:00.000Z')).toBe('16. Juli 2025');
    });

    test('does not shift genuine evening timestamps (20:00–21:59 UTC)', () => {
        expect(formatDateShort('2025-01-15T20:00:00.000Z')).toBe('15. Jan. 2025');
        expect(formatDateShort('2025-01-15T20:30:00.000Z')).toBe('15. Jan. 2025');
        expect(formatDateShort('2025-01-15T21:00:00.000Z')).toBe('15. Jan. 2025');
        expect(formatDateShort('2025-01-15T21:59:59.000Z')).toBe('15. Jan. 2025');
        expect(formatDateShort('2025-01-15T19:30:00.000Z')).toBe('15. Jan. 2025');
    });

    test('renders genuine late-night posts on the Berlin calendar day', () => {
        // 23:30Z in winter is already 00:30 the next day in Berlin.
        expect(formatDateShort('2024-01-20T23:30:00.000Z')).toBe('21. Jan. 2024');
        // 22:30Z in summer is already 00:30 the next day in Berlin.
        expect(formatDateShort('2026-03-30T22:30:00.000Z')).toBe('31. März 2026');
    });

    test('keeps an evening timestamp that is still the same Berlin day', () => {
        expect(formatDateShort('2025-01-15T22:30:00.000Z')).toBe('15. Jan. 2025');
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
