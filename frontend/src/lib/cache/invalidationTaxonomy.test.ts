import {describe, expect, test} from 'vitest';

import {INVALIDATION_TARGETS} from '@/src/lib/shared/invalidation';

import {INVALIDATION_TAXONOMY, isInvalidationTarget} from './invalidationTaxonomy';

describe('invalidation taxonomy contract (frontend)', () => {
    test('taxonomy keys match the shared manifest', () => {
        expect(Object.keys(INVALIDATION_TAXONOMY).sort()).toEqual([...INVALIDATION_TARGETS].sort());
    });

    test('every taxonomy entry exposes tags/pages/paths arrays', () => {
        for (const entry of Object.values(INVALIDATION_TAXONOMY)) {
            expect(Array.isArray(entry.tags)).toBe(true);
            expect(Array.isArray(entry.pages)).toBe(true);
            expect(Array.isArray(entry.paths)).toBe(true);
        }
    });
});

describe('isInvalidationTarget', () => {
    test('recognizes known targets', () => {
        expect(isInvalidationTarget('article')).toBe(true);
        expect(isInvalidationTarget('search-index')).toBe(true);
        expect(isInvalidationTarget('audiofeed')).toBe(true);
    });

    test('rejects unknown values', () => {
        expect(isInvalidationTarget('nonsense')).toBe(false);
        expect(isInvalidationTarget('')).toBe(false);
    });
});
