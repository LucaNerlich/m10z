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
