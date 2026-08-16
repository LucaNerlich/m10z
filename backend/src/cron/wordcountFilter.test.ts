import {describe, expect, test, vi} from 'vitest';

import {generateMissingWordCounts} from './wordcount';

describe('generateMissingWordCounts filter', () => {
    test('only targets documents with a null wordCount (0 must not match)', async () => {
        const findMany = vi.fn(() => Promise.resolve([]));
        const strapi = {
            documents: vi.fn(() => ({findMany})),
            log: {info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn()},
        };

        await generateMissingWordCounts({strapi});

        // Four backfill runs (articles/podcasts × published/draft); each must use the
        // narrow filter so documents with a legitimate 0 wordCount are never re-processed.
        expect(findMany).toHaveBeenCalledTimes(4);
        for (const [params] of findMany.mock.calls) {
            expect(params.filters).toEqual({wordCount: {$null: true}});
        }
    });
});
