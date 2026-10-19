import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchArticlesInDateRange: vi.fn(),
    fetchPodcastsInDateRange: vi.fn(),
}));

vi.mock('@/src/lib/strapiContent', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/src/lib/strapiContent')>();
    return {
        ...actual,
        fetchArticlesInDateRange: mocks.fetchArticlesInDateRange,
        fetchPodcastsInDateRange: mocks.fetchPodcastsInDateRange,
    };
});

vi.mock('@/src/lib/statistik/statistikSource', () => ({
    getStatistikDashboard: vi.fn().mockResolvedValue(null),
}));

import StatistikMonthPage from './page';

describe('StatistikMonthPage transient failure handling', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        mocks.fetchArticlesInDateRange.mockReset();
        mocks.fetchPodcastsInDateRange.mockReset();
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
        vi.unstubAllEnvs();
    });

    test('rethrows at runtime so ISR keeps the last good page', async () => {
        vi.stubEnv('NEXT_PHASE', 'phase-production-server');
        const failure = new Error('Strapi request failed: 500 Internal Server Error');
        mocks.fetchArticlesInDateRange.mockRejectedValue(failure);
        mocks.fetchPodcastsInDateRange.mockResolvedValue([]);

        await expect(
            StatistikMonthPage({params: Promise.resolve({monat: '2025-01'})}),
        ).rejects.toBe(failure);
        expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    test('degrades to the empty state during next build', async () => {
        vi.stubEnv('NEXT_PHASE', 'phase-production-build');
        mocks.fetchArticlesInDateRange.mockRejectedValue(new Error('boom'));
        mocks.fetchPodcastsInDateRange.mockResolvedValue([]);

        const page = await StatistikMonthPage({params: Promise.resolve({monat: '2025-01'})});

        expect(renderToStaticMarkup(page)).toContain(
            'Die Inhalte dieses Monats konnten gerade nicht geladen werden.',
        );
        expect(errorSpy).toHaveBeenCalledTimes(1);
    });
});
