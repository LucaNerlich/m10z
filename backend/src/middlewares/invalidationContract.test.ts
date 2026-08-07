import {describe, expect, test} from 'vitest';

import {CONTENT_TYPE_KEYS, CONTENT_TYPES} from '../shared/contracts/strapi-contract/registry';

describe('cache invalidation contract (backend)', () => {
    test('every non-synthetic content type has a unique uid', () => {
        const nonSyntheticKeys = CONTENT_TYPE_KEYS.filter((key) => key !== 'search-index' && key !== 'sitemap');
        const uids = nonSyntheticKeys.map((key) => CONTENT_TYPES[key].uid);
        for (const uid of uids) {
            expect(uid).toBeTruthy();
        }
        expect(new Set(uids).size).toBe(uids.length);
    });

    test('every content type with relations declares them against a known content type key', () => {
        for (const key of CONTENT_TYPE_KEYS) {
            const {relations} = CONTENT_TYPES[key];
            if (!relations) continue;
            for (const relatedKey of Object.values(relations)) {
                expect(CONTENT_TYPE_KEYS as readonly string[]).toContain(relatedKey);
            }
        }
    });

    test('collection types with draft & publish (article, podcast) only invalidate on publish-affecting actions', () => {
        for (const key of ['article', 'podcast'] as const) {
            expect(CONTENT_TYPES[key].invalidatesOn).toEqual(
                expect.arrayContaining(['publish', 'unpublish', 'delete']),
            );
            expect(CONTENT_TYPES[key].invalidatesOn).not.toContain('update');
        }
    });

    test('synthetic types (search-index, sitemap) are never matched against a mutation uid', () => {
        for (const key of ['search-index', 'sitemap'] as const) {
            expect(CONTENT_TYPES[key].uid).toBeUndefined();
            expect(CONTENT_TYPES[key].invalidatesOn).toEqual([]);
        }
    });
});
