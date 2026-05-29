import {describe, expect, test} from 'vitest';

import {INVALIDATE_TARGETS} from '../utils/invalidateNextCache';
import {UID_TO_TARGETS} from './cacheInvalidation';

/**
 * Canonical cache-invalidation targets shared by the Strapi backend and the
 * Next.js frontend. This list MUST equal Object.keys(INVALIDATION_TAXONOMY) in
 * `frontend/src/lib/cache/invalidationTaxonomy.ts` (asserted there too). If the
 * two drift, Strapi POSTs hit a 404 route and content silently stays stale.
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

describe('cache invalidation contract (backend)', () => {
    test('INVALIDATE_TARGETS matches the canonical target set', () => {
        expect([...INVALIDATE_TARGETS].sort()).toEqual(CANONICAL_TARGETS);
    });

    test('every UID_TO_TARGETS target is a known invalidation target', () => {
        const known = new Set<string>(INVALIDATE_TARGETS);
        for (const {target} of Object.values(UID_TO_TARGETS)) {
            expect(known.has(target)).toBe(true);
        }
    });
});
