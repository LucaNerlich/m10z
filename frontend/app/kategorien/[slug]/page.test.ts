import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchCategoryPageData: vi.fn(),
    fetchCategoryBySlug: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    notFound: () => {
        const error = new Error('NEXT_HTTP_ERROR_FALLBACK;404') as Error & {digest?: string};
        error.digest = 'NEXT_HTTP_ERROR_FALLBACK;404';
        throw error;
    },
}));

vi.mock('@/src/lib/strapiContent', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/src/lib/strapiContent')>();
    return {
        ...actual,
        fetchCategoryPageData: mocks.fetchCategoryPageData,
        fetchCategoryBySlug: mocks.fetchCategoryBySlug,
    };
});

import CategoryDetailPage from './page';

describe('CategoryDetailPage error handling', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        mocks.fetchCategoryPageData.mockReset();
        mocks.fetchCategoryBySlug.mockReset();
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
    });

    test('returns 404 for an unknown category without logging a fetch error', async () => {
        mocks.fetchCategoryPageData.mockResolvedValue(null);

        await expect(
            CategoryDetailPage({params: Promise.resolve({slug: 'gibt-es-nicht'})}),
        ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');

        expect(errorSpy).not.toHaveBeenCalled();
    });

    test('logs and rethrows a transient fetch failure', async () => {
        const failure = new Error('Strapi request failed: 500 Internal Server Error');
        mocks.fetchCategoryPageData.mockRejectedValue(failure);

        await expect(
            CategoryDetailPage({params: Promise.resolve({slug: 'gaming'})}),
        ).rejects.toBe(failure);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy.mock.calls[0]?.[0]).toContain('Error fetching category for slug "gaming"');
    });
});
