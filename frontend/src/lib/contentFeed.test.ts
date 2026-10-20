import {beforeEach, describe, expect, test, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchArticlesPage: vi.fn(),
    fetchPodcastsPage: vi.fn(),
}));

vi.mock('@/src/lib/strapiContent', () => mocks);

import {buildContentFeed} from './contentFeed';

function article(slug: string) {
    return {id: 1, slug, title: slug, publishedAt: '2024-01-01', date: '2024-01-01', content: ''};
}

function page<T>(items: T[], total: number, pageNumber: number) {
    const pageCount = Math.max(1, Math.ceil(total / 100));
    return {
        items,
        pagination: {page: pageNumber, pageSize: 100, total, pageCount},
        hasNextPage: pageNumber < pageCount,
    };
}

describe('buildContentFeed', () => {
    beforeEach(() => {
        mocks.fetchArticlesPage.mockReset();
        mocks.fetchPodcastsPage.mockReset();
    });

    test('fetches every 100-item chunk needed for a deep page', async () => {
        const articles = Array.from({length: 250}, (_, index) => article(`a${index}`));
        mocks.fetchArticlesPage.mockImplementation(async ({page: pageNumber}: {page: number}) =>
            page(articles.slice((pageNumber - 1) * 100, pageNumber * 100), articles.length, pageNumber),
        );
        mocks.fetchPodcastsPage.mockResolvedValue(page([], 0, 1));

        const result = await buildContentFeed(25, 10);

        expect(mocks.fetchArticlesPage.mock.calls.map(([args]) => args.page)).toEqual([1, 2, 3]);
        expect(result.pagination.pageCount).toBe(25);
        expect(result.items).toHaveLength(10);
        expect(result.items[0]?.slug).toBe('a240');
    });

    test('does not request a chunk past the collection', async () => {
        const articles = Array.from({length: 40}, (_, index) => article(`a${index}`));
        mocks.fetchArticlesPage.mockImplementation(async ({page: pageNumber}: {page: number}) =>
            page(articles.slice((pageNumber - 1) * 100, pageNumber * 100), articles.length, pageNumber),
        );
        mocks.fetchPodcastsPage.mockResolvedValue(page([], 0, 1));

        await buildContentFeed(25, 10);

        expect(mocks.fetchArticlesPage.mock.calls.map(([args]) => args.page)).toEqual([1]);
    });

    test('returns an out-of-range page without fanning out over either collection', async () => {
        const articles = Array.from({length: 1000}, (_, index) => article(`a${index}`));
        mocks.fetchArticlesPage.mockImplementation(
            async ({page: pageNumber, pageSize}: {page: number; pageSize: number}) =>
                page(articles.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), articles.length, pageNumber),
        );
        mocks.fetchPodcastsPage.mockResolvedValue(page([], 0, 1));

        const result = await buildContentFeed(500, 100);

        expect(mocks.fetchArticlesPage.mock.calls.map(([args]) => args.page)).toEqual([1]);
        expect(mocks.fetchPodcastsPage.mock.calls.map(([args]) => args.page)).toEqual([1]);
        expect(result.items).toEqual([]);
        expect(result.pagination.pageCount).toBe(10);
    });

    test('page 1 requests only the page size, not a full 100-item chunk', async () => {
        mocks.fetchArticlesPage.mockResolvedValue(page([], 0, 1));
        mocks.fetchPodcastsPage.mockResolvedValue(page([], 0, 1));

        await buildContentFeed(1, 10);

        expect(mocks.fetchArticlesPage.mock.calls[0]?.[0].pageSize).toBe(10);
        expect(mocks.fetchPodcastsPage.mock.calls[0]?.[0].pageSize).toBe(10);
    });

    test('drops a boundary item repeated by a shifted parallel page', async () => {
        const articles = Array.from({length: 200}, (_, index) => article(`a${index}`));
        mocks.fetchArticlesPage.mockImplementation(async ({page: pageNumber}: {page: number}) => {
            const items =
                pageNumber === 1
                    ? articles.slice(0, 100)
                    : [articles[99]!, ...articles.slice(100, 200)];
            return page(items, articles.length, pageNumber);
        });
        mocks.fetchPodcastsPage.mockResolvedValue(page([], 0, 1));

        const result = await buildContentFeed(15, 10);

        expect(mocks.fetchArticlesPage.mock.calls.map(([args]) => args.page)).toEqual([1, 2]);
        expect(result.items.map((item) => item.slug)).toEqual([
            'a140',
            'a141',
            'a142',
            'a143',
            'a144',
            'a145',
            'a146',
            'a147',
            'a148',
            'a149',
        ]);
    });
});
