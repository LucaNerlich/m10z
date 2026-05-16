import {describe, expect, test} from 'vitest';

import {computeAuthorContentStats} from './authorContentStats';

function cat(slug: string, title?: string) {
    return {slug, title: title ?? slug};
}

describe('computeAuthorContentStats', () => {
    test('counts categories across articles and podcasts independently', () => {
        const articles = [
            {categories: [cat('gaming'), cat('news')]},
            {categories: [cat('gaming')]},
            {categories: [cat('news')]},
        ];
        const podcasts = [{categories: [cat('gaming')]}];

        const result = computeAuthorContentStats(articles, podcasts);
        expect(result.articles.total).toBe(3);
        expect(result.podcasts.total).toBe(1);
        expect(result.articles.categories).toEqual([
            {slug: 'gaming', title: 'gaming', count: 2},
            {slug: 'news', title: 'news', count: 2},
        ]);
        expect(result.podcasts.categories).toEqual([
            {slug: 'gaming', title: 'gaming', count: 1},
        ]);
    });

    test('sorts categories by count desc, then title ascending', () => {
        const articles = [
            {categories: [cat('z-cat'), cat('a-cat'), cat('m-cat')]},
        ];
        const result = computeAuthorContentStats(articles, []);
        // All count = 1, so German locale title sort: a-cat, m-cat, z-cat
        expect(result.articles.categories.map((c) => c.slug)).toEqual(['a-cat', 'm-cat', 'z-cat']);
    });

    test('skips categories with empty slugs', () => {
        const articles = [
            {categories: [{slug: '', title: 'Empty'}, cat('valid')]},
        ];
        const result = computeAuthorContentStats(articles, []);
        expect(result.articles.categories).toEqual([{slug: 'valid', title: 'valid', count: 1}]);
    });

    test('handles items without categories', () => {
        const articles = [{}, {categories: null}, {categories: undefined}, {categories: [cat('one')]}];
        const result = computeAuthorContentStats(articles, []);
        expect(result.articles.total).toBe(4);
        expect(result.articles.categories).toEqual([{slug: 'one', title: 'one', count: 1}]);
    });

    test('uses pagination.total when input is a PaginatedResult', () => {
        const paginated = {
            items: [{categories: [cat('only-one')]}],
            pagination: {page: 1, pageSize: 25, pageCount: 4, total: 100},
            hasNextPage: true,
        };
        const result = computeAuthorContentStats(paginated, []);
        expect(result.articles.total).toBe(100);
        expect(result.articles.categories).toEqual([{slug: 'only-one', title: 'only-one', count: 1}]);
    });
});
