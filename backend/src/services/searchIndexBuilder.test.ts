import {describe, expect, test, vi} from 'vitest';

import {buildAndPersistSearchIndex} from './searchIndexBuilder';

function makeArticle(i: number) {
    return {
        documentId: `article-${i}`,
        slug: `article-${i}`,
        title: `Artikel ${i}`,
        publishedAt: '2026-04-20T10:00:00.000Z',
    };
}

function makeStrapi(articleCount: number) {
    const articles = Array.from({length: articleCount}, (_, i) => makeArticle(i + 1));
    const articleFindMany = vi.fn((params: {limit?: number; start?: number}) => {
        const pageSize = params.limit ?? 100;
        const start = params.start ?? 0;
        return Promise.resolve(articles.slice(start, start + pageSize));
    });
    const emptyFindMany = vi.fn(() => Promise.resolve([]));
    const create = vi.fn(() => Promise.resolve({}));
    const update = vi.fn(() => Promise.resolve({}));
    const findFirst = vi.fn(() => Promise.resolve(null));

    const strapi = {
        documents: vi.fn((uid: string) => {
            if (uid === 'api::article.article') return {findMany: articleFindMany};
            if (uid === 'api::search-index.search-index') return {findFirst, create, update};
            return {findMany: emptyFindMany};
        }),
        log: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()},
    };

    return {strapi, articleFindMany, create};
}

describe('buildAndPersistSearchIndex pagination', () => {
    test('fetches all pages when a content type exceeds the page size', async () => {
        const {strapi, articleFindMany, create} = makeStrapi(250);

        const {index} = await buildAndPersistSearchIndex(strapi as any);

        // 250 articles => pages 1..3 (100 + 100 + 50)
        expect(articleFindMany).toHaveBeenCalledTimes(3);
        expect(index.total).toBe(250);
        expect(index.records).toHaveLength(250);
        expect(create).toHaveBeenCalledTimes(1);
    });

    test('stops after a single page when a content type fits within it', async () => {
        const {strapi, articleFindMany} = makeStrapi(42);

        const {index} = await buildAndPersistSearchIndex(strapi as any);

        expect(articleFindMany).toHaveBeenCalledTimes(1);
        expect(index.total).toBe(42);
    });
});
