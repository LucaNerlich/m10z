import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchAuthorBySlug: vi.fn(),
    fetchArticlesByAuthorPaginated: vi.fn(),
    fetchPodcastsByAuthorPaginated: vi.fn(),
}));

vi.mock('@/src/lib/strapiContent', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/src/lib/strapiContent')>();
    return {...actual, ...mocks};
});

import AuthorPage from './page';

const author = {
    id: 1,
    title: 'Jane',
    slug: 'jane',
    description: 'Autorin',
    avatar: null,
    categories: [],
    articles: [],
    podcasts: [
        {
            id: 10,
            title: 'Episode',
            slug: 'episode',
            publishedAt: '2026-01-01T00:00:00.000Z',
            date: '2026-01-01T00:00:00.000Z',
            categories: [],
        },
    ],
};

describe('AuthorPage article section', () => {
    beforeEach(() => {
        mocks.fetchAuthorBySlug.mockReset();
        mocks.fetchArticlesByAuthorPaginated.mockReset();
        mocks.fetchPodcastsByAuthorPaginated.mockReset();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('keeps the section and shows an error state when the article fetch fails', async () => {
        mocks.fetchAuthorBySlug.mockResolvedValue({
            ...author,
            podcasts: [],
            articles: [
                {
                    id: 11,
                    title: 'Beitrag',
                    slug: 'beitrag',
                    publishedAt: '2026-01-02T00:00:00.000Z',
                    date: '2026-01-02T00:00:00.000Z',
                    categories: [],
                },
            ],
        });
        mocks.fetchArticlesByAuthorPaginated.mockRejectedValue(new Error('Strapi 500'));
        mocks.fetchPodcastsByAuthorPaginated.mockResolvedValue({
            items: [],
            pagination: {total: 0, pageCount: 0},
        });

        const page = await AuthorPage({params: Promise.resolve({slug: 'jane'})});
        const html = renderToStaticMarkup(page);

        expect(html).toContain('Artikel (1)');
        expect(html).toContain('Artikel konnten gerade nicht geladen werden');
    });
});

describe('AuthorPage podcast section', () => {
    beforeEach(() => {
        mocks.fetchAuthorBySlug.mockReset();
        mocks.fetchArticlesByAuthorPaginated.mockReset();
        mocks.fetchPodcastsByAuthorPaginated.mockReset();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('keeps the section and shows an error state when the podcast fetch fails', async () => {
        mocks.fetchAuthorBySlug.mockResolvedValue(author);
        mocks.fetchArticlesByAuthorPaginated.mockResolvedValue({
            items: [],
            pagination: {total: 0, pageCount: 0},
        });
        mocks.fetchPodcastsByAuthorPaginated.mockRejectedValue(new Error('Strapi 500'));

        const page = await AuthorPage({params: Promise.resolve({slug: 'jane'})});
        const html = renderToStaticMarkup(page);

        expect(html).toContain('Podcasts (1)');
        expect(html).toContain('Podcasts konnten gerade nicht geladen werden');
    });

    test('hides the section when the author genuinely has no podcasts', async () => {
        mocks.fetchAuthorBySlug.mockResolvedValue({...author, podcasts: []});
        mocks.fetchArticlesByAuthorPaginated.mockResolvedValue({
            items: [],
            pagination: {total: 0, pageCount: 0},
        });
        mocks.fetchPodcastsByAuthorPaginated.mockRejectedValue(new Error('Strapi 500'));

        const page = await AuthorPage({params: Promise.resolve({slug: 'jane'})});
        const html = renderToStaticMarkup(page);

        expect(html).not.toContain('Podcasts (');
    });
});
