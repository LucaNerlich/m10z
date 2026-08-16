import {describe, expect, test, vi} from 'vitest';

import {buildAndPersistSearchIndex} from './searchIndexBuilder';

/**
 * Stateful fake of the search-index single type: `findFirst` reads the stored
 * version, `create`/`update` write it — mirroring the read-modify-write in
 * `saveIndex` closely enough to expose a concurrent version collision.
 */
function makeStrapi({fetchDelayMs = 5}: {fetchDelayMs?: number} = {}) {
    const delay = () => new Promise((resolve) => setTimeout(resolve, fetchDelayMs));

    const state: {current: {documentId: string; version: number} | null} = {current: null};
    const findFirst = vi.fn(async () => state.current);
    const create = vi.fn(async ({data}: {data: {version: number}}) => {
        state.current = {documentId: 'search-index', version: data.version};
    });
    const update = vi.fn(async ({data}: {data: {version: number}}) => {
        state.current = {documentId: 'search-index', version: data.version};
    });

    const articleFindMany = vi.fn(async () => {
        await delay();
        return [
            {
                documentId: 'article-1',
                slug: 'article-1',
                title: 'Artikel 1',
                publishedAt: '2026-04-20T10:00:00.000Z',
            },
        ];
    });
    const emptyFindMany = vi.fn(async () => []);

    const strapi = {
        documents: vi.fn((uid: string) => {
            if (uid === 'api::article.article') return {findMany: articleFindMany};
            if (uid === 'api::search-index.search-index') return {findFirst, create, update};
            return {findMany: emptyFindMany};
        }),
        log: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()},
    };

    return {strapi, findFirst, create, update};
}

describe('buildAndPersistSearchIndex concurrency', () => {
    test('serializes concurrent builds so versions never collide', async () => {
        const {strapi, create, update} = makeStrapi({fetchDelayMs: 20});

        // Two overlapping builds (nightly cron + queue-triggered rebuild).
        const [first, second] = await Promise.all([
            buildAndPersistSearchIndex(strapi as any, {source: 'cron'}),
            buildAndPersistSearchIndex(strapi as any, {source: 'queue'}),
        ]);

        expect(create).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledTimes(1);

        const versions = [first.index.version, second.index.version].sort((a, b) => a - b);
        expect(versions).toEqual([1, 2]);
        expect(update).toHaveBeenCalledWith(
            expect.objectContaining({data: expect.objectContaining({version: 2})}),
        );
    });

    test('a failed build does not break the chain for the next one', async () => {
        const {strapi, create} = makeStrapi({fetchDelayMs: 0});
        strapi.documents = vi.fn((uid: string) => {
            if (uid === 'api::search-index.search-index') {
                return {
                    findFirst: vi.fn(async () => null),
                    create: vi.fn(async () => {
                        throw new Error('db down');
                    }),
                    update: vi.fn(),
                };
            }
            return {findMany: vi.fn(async () => [])};
        }) as any;

        await expect(buildAndPersistSearchIndex(strapi as any)).rejects.toThrow('db down');

        // A subsequent build still runs (and succeeds against a fresh mock state).
        const healthy = makeStrapi({fetchDelayMs: 0});
        const {index} = await buildAndPersistSearchIndex(healthy.strapi as any);
        expect(healthy.create).toHaveBeenCalledTimes(1);
        expect(index.version).toBe(1);
    });
});
