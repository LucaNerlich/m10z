import {describe, expect, test} from 'vitest';

import {formatContentCounts} from './contentCounts';

describe('formatContentCounts', () => {
    test('returns "Keine Inhalte" when there is nothing to count', () => {
        expect(formatContentCounts()).toBe('Keine Inhalte');
        expect(formatContentCounts(0, 0)).toBe('Keine Inhalte');
    });

    test('formats article counts without a singular form (Artikel is invariant)', () => {
        expect(formatContentCounts(1)).toBe('1 Artikel');
        expect(formatContentCounts(3)).toBe('3 Artikel');
    });

    test('formats podcast counts with a singular form', () => {
        expect(formatContentCounts(undefined, 1)).toBe('1 Podcast');
        expect(formatContentCounts(undefined, 2)).toBe('2 Podcasts');
    });

    test('joins both counts with a comma', () => {
        expect(formatContentCounts(3, 2)).toBe('3 Artikel, 2 Podcasts');
    });
});
