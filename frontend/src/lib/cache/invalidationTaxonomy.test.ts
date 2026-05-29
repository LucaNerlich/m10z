import {describe, expect, test} from 'vitest';

import {INVALIDATION_TAXONOMY, isInvalidationTarget} from './invalidationTaxonomy';

/**
 * Canonical cache-invalidation targets shared by the Next.js frontend and the
 * Strapi backend. This list MUST equal INVALIDATE_TARGETS in
 * `backend/src/utils/invalidateNextCache.ts` (asserted there too). If the two
 * drift, Strapi POSTs hit a 404 route and content silently stays stale.
 */
const CANONICAL_TARGETS = [
    'about',
    'article',
    'articlefeed',
    'audiofeed',
    'author',
    'category',
    'legal',
    'podcast',
    'search-index',
    'sitemap',
].sort();

describe('invalidation taxonomy contract (frontend)', () => {
    test('taxonomy keys match the canonical target set', () => {
        expect(Object.keys(INVALIDATION_TAXONOMY).sort()).toEqual(CANONICAL_TARGETS);
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
