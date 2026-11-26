import {describe, expect, test} from 'vitest';

import {capSearchQuery, normalizeSearchQuery, SEARCH_MAX_QUERY_LENGTH} from './searchStatus';

describe('normalizeSearchQuery', () => {
    test('trims and leaves a short query untouched', () => {
        expect(normalizeSearchQuery('  spiele  ')).toBe('spiele');
    });

    test('caps at the shared maximum', () => {
        expect(normalizeSearchQuery('a'.repeat(500))).toHaveLength(SEARCH_MAX_QUERY_LENGTH);
    });

    test('drops a surrogate pair that the cap would split', () => {
        const query = 'a'.repeat(SEARCH_MAX_QUERY_LENGTH - 1) + '😀';

        const normalized = normalizeSearchQuery(query);

        expect(normalized).toBe('a'.repeat(SEARCH_MAX_QUERY_LENGTH - 1));
        expect(() => encodeURIComponent(normalized)).not.toThrow();
    });

    test('keeps a whole emoji that fits inside the cap', () => {
        const query = 'a'.repeat(SEARCH_MAX_QUERY_LENGTH - 2) + '😀';
        expect(normalizeSearchQuery(query)).toBe(query);
    });
});

describe('capSearchQuery', () => {
    test('does not trim, so a typed multi-word query keeps its separator', () => {
        expect(capSearchQuery('spiele ')).toBe('spiele ');
        expect(capSearchQuery(' spiele')).toBe(' spiele');
    });

    test('is encodable when the cap lands mid-pair', () => {
        const capped = capSearchQuery('a'.repeat(SEARCH_MAX_QUERY_LENGTH - 1) + '😀');
        expect(() => encodeURIComponent(capped)).not.toThrow();
    });
});
