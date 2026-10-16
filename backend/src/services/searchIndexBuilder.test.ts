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
    const articleFindMany = vi.fn((params: {limit?: number; start?: number; sort?: string}) => {
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

    test('requests a stable sort on every page', async () => {
        const {strapi, articleFindMany} = makeStrapi(250);

        await buildAndPersistSearchIndex(strapi as any);

        expect(articleFindMany.mock.calls.length).toBeGreaterThan(1);
        for (const [params] of articleFindMany.mock.calls) {
            expect(params.sort).toBe('documentId:asc');
        }
    });
});

describe('buildAndPersistSearchIndex media urls', () => {
    const ORIGIN = 'https://cms.m10z.de';

    function makeMediaStrapi() {
        const empty = () => Promise.resolve([]);
        const documents = vi.fn((uid: string) => {
            if (uid === 'api::author.author') {
                return {
                    findMany: vi.fn(() =>
                        Promise.resolve([
                            {documentId: 'a1', slug: 'luca', title: 'Luca', avatar: {url: '/uploads/luca.jpg'}},
                            {documentId: 'a2', slug: 'ohne-bild', title: 'Ohne Bild'},
                        ]),
                    ),
                };
            }
            if (uid === 'api::category.category') {
                return {
                    findMany: vi.fn(() =>
                        Promise.resolve([
                            // Absolute cover: kept as-is, and wins over the banner.
                            {
                                documentId: 'c1',
                                slug: 'games',
                                title: 'Games',
                                cover: {url: 'https://cdn.example/cover.jpg'},
                                banner: {url: '/uploads/games-banner.jpg'},
                            },
                            // No cover: the banner fallback applies.
                            {documentId: 'c2', slug: 'tech', title: 'Tech', banner: {url: '/uploads/tech-banner.jpg'}},
                        ]),
                    ),
                };
            }
            if (uid === 'api::search-index.search-index') {
                return {
                    findFirst: vi.fn(() => Promise.resolve(null)),
                    create: vi.fn(() => Promise.resolve({})),
                    update: vi.fn(() => Promise.resolve({})),
                };
            }
            return {findMany: vi.fn(empty)};
        });

        return {
            documents,
            log: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()},
        };
    }

    function record(index: {records: {id: string; coverImageUrl: string | null}[]}, id: string) {
        const found = index.records.find((entry) => entry.id === id);
        if (!found) throw new Error(`record ${id} missing from the index`);
        return found;
    }

    test('resolves author avatars and category covers through the shared media resolvers', async () => {
        const previousDomain = process.env.BASE_DOMAIN;
        process.env.BASE_DOMAIN = ORIGIN;
        try {
            const {index} = await buildAndPersistSearchIndex(makeMediaStrapi() as any);

            // Relative upload path -> resolved against the CMS origin.
            expect(record(index, 'author:luca').coverImageUrl).toBe(`${ORIGIN}/uploads/luca.jpg`);
            // No avatar at all -> no image.
            expect(record(index, 'author:ohne-bild').coverImageUrl).toBeNull();
            // Absolute URL -> kept verbatim, cover before banner.
            expect(record(index, 'category:games').coverImageUrl).toBe('https://cdn.example/cover.jpg');
            // Cover missing -> banner, resolved against the CMS origin.
            expect(record(index, 'category:tech').coverImageUrl).toBe(`${ORIGIN}/uploads/tech-banner.jpg`);
        } finally {
            if (previousDomain === undefined) delete process.env.BASE_DOMAIN;
            else process.env.BASE_DOMAIN = previousDomain;
        }
    });
});
