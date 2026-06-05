import {describe, expect, test} from 'vitest';

import {
    clampContentFeedPage,
    clampContentFeedPageSize,
    computeContentFeedFetchSize,
    mergeFeedItems,
    paginateMergedFeed,
} from './mergeFeedItems';
import type {StrapiArticle, StrapiPodcast} from '@/src/lib/strapi/contentTypes';

function article(slug: string, date: string): StrapiArticle {
    return {id: 1, slug, title: slug, publishedAt: date, date, content: ''};
}

function podcast(slug: string, date: string): StrapiPodcast {
    return {id: 1, slug, title: slug, publishedAt: date, date, duration: 60, file: {}};
}

describe('mergeFeedItems', () => {
    test('sorts articles and podcasts by published date descending', () => {
        const merged = mergeFeedItems(
            [article('a', '2024-01-01'), article('b', '2024-03-01')],
            [podcast('p', '2024-02-01')],
        );
        expect(merged.map((i) => i.slug)).toEqual(['b', 'p', 'a']);
    });
});

describe('paginateMergedFeed', () => {
    test('uses sum of source totals for pageCount', () => {
        const items = mergeFeedItems([article('a', '2024-01-01')], [podcast('p', '2024-02-01')]);
        const result = paginateMergedFeed({
            items,
            page: 1,
            pageSize: 1,
            articleTotal: 10,
            podcastTotal: 5,
        });
        expect(result.pagination.total).toBe(15);
        expect(result.pagination.pageCount).toBe(15);
        expect(result.items).toHaveLength(1);
        expect(result.items[0]?.slug).toBe('p');
    });

    test('returns correct slice on page 2', () => {
        const items = mergeFeedItems(
            [article('a', '2024-01-01')],
            [podcast('p1', '2024-03-01'), podcast('p2', '2024-02-01')],
        );
        const result = paginateMergedFeed({
            items,
            page: 2,
            pageSize: 1,
            articleTotal: 1,
            podcastTotal: 2,
        });
        expect(result.items[0]?.slug).toBe('p2');
    });
});

describe('clamp helpers', () => {
    test('computeContentFeedFetchSize over-fetches by 5 capped at 200', () => {
        expect(computeContentFeedFetchSize(1, 10)).toBe(15);
        expect(computeContentFeedFetchSize(20, 10)).toBe(200);
    });

    test('clampContentFeedPageSize caps at 100', () => {
        expect(clampContentFeedPageSize(150)).toBe(100);
    });

    test('clampContentFeedPage floors at 1', () => {
        expect(clampContentFeedPage(0)).toBe(1);
    });
});
