import {describe, expect, test} from 'vitest';

import {formatMonthCompact, formatMonthLong, formatMonthShort, formatVotes} from './formatters';

describe('formatVotes', () => {
    test.each([
        [0, '0 Stimmen'],
        [1, '1 Stimme'],
        [2, '2 Stimmen'],
        [10, '10 Stimmen'],
    ])('%i → %s', (input, expected) => {
        expect(formatVotes(input)).toBe(expected);
    });
});

describe('formatMonthLong', () => {
    test('2025-12 → "Dezember 2025"', () => {
        expect(formatMonthLong('2025-12')).toBe('Dezember 2025');
    });

    test('2026-01 → "Januar 2026"', () => {
        expect(formatMonthLong('2026-01')).toBe('Januar 2026');
    });

    test('invalid month-id falls back to the input', () => {
        expect(formatMonthLong('not-a-month')).toBe('not-a-month');
    });
});

describe('formatMonthShort', () => {
    test('2025-12 → "Dezember 25"', () => {
        expect(formatMonthShort('2025-12')).toBe('Dezember 25');
    });
});

describe('formatMonthCompact', () => {
    test('2025-12 → "Dez. 25"', () => {
        // Intl uses the runtime's German formatter; verify month abbreviation prefix + year suffix
        const result = formatMonthCompact('2025-12');
        expect(result).toMatch(/^Dez\.?\s*25$/);
    });

    test('invalid month-id falls back to the input', () => {
        expect(formatMonthCompact('not-a-month')).toBe('not-a-month');
    });
});
