import {afterEach, describe, expect, test, vi} from 'vitest';

import {getCategoryActiveMonths, isCategoryRecentlyActive, splitCategoriesByActivity} from './categoryActivity';
import {type StrapiCategoryWithContent} from '@/src/lib/strapiContent';

const NOW = new Date('2026-09-02T12:00:00Z');

function category(overrides: Partial<StrapiCategoryWithContent> = {}): StrapiCategoryWithContent {
    return {
        id: 1,
        slug: 'test',
        title: 'Test',
        ...overrides,
    };
}

describe('getCategoryActiveMonths', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    test('defaults to 6 when env var is unset', () => {
        vi.stubEnv('CATEGORY_ACTIVE_MONTHS', undefined);
        expect(getCategoryActiveMonths()).toBe(6);
    });

    test('parses a valid integer', () => {
        vi.stubEnv('CATEGORY_ACTIVE_MONTHS', '12');
        expect(getCategoryActiveMonths()).toBe(12);
    });

    test('falls back on invalid values', () => {
        for (const value of ['abc', '0', '-1', '3.5', '']) {
            vi.stubEnv('CATEGORY_ACTIVE_MONTHS', value);
            expect(getCategoryActiveMonths()).toBe(6);
        }
    });
});

describe('isCategoryRecentlyActive', () => {
    test('category with a recent article is active', () => {
        const c = category({articles: [{slug: 'a', title: 'A', date: '2026-08-01'}]});
        expect(isCategoryRecentlyActive(c, NOW)).toBe(true);
    });

    test('category with a recent podcast is active', () => {
        const c = category({podcasts: [{slug: 'p', title: 'P', publishedAt: '2026-07-15T10:00:00Z'}]});
        expect(isCategoryRecentlyActive(c, NOW)).toBe(true);
    });

    test('category with only old content is not active', () => {
        const c = category({articles: [{slug: 'a', title: 'A', date: '2026-01-01'}]});
        expect(isCategoryRecentlyActive(c, NOW)).toBe(false);
    });

    test('`date` override takes precedence over `publishedAt`', () => {
        const c = category({
            articles: [{slug: 'a', title: 'A', date: '2026-08-01', publishedAt: '2020-01-01'}],
        });
        expect(isCategoryRecentlyActive(c, NOW)).toBe(true);
    });

    test('one recent item among old ones makes the category active', () => {
        const c = category({
            articles: [{slug: 'a', title: 'A', date: '2020-01-01'}],
            podcasts: [{slug: 'p', title: 'P', publishedAt: '2026-09-01'}],
        });
        expect(isCategoryRecentlyActive(c, NOW)).toBe(true);
    });

    test('content exactly at the cutoff counts as active', () => {
        const c = category({articles: [{slug: 'a', title: 'A', date: '2026-03-02T12:00:00Z'}]});
        expect(isCategoryRecentlyActive(c, NOW)).toBe(true);
    });

    test('items without a valid date are ignored', () => {
        const c = category({articles: [{slug: 'a', title: 'A'}, {slug: 'b', title: 'B', date: 'not-a-date'}]});
        expect(isCategoryRecentlyActive(c, NOW)).toBe(false);
    });

    test('category without any content is not active', () => {
        expect(isCategoryRecentlyActive(category(), NOW)).toBe(false);
    });
});

describe('splitCategoriesByActivity', () => {
    test('splits into active and archived, sorted alphabetically', () => {
        const activeZ = category({id: 1, slug: 'z', title: 'Zebras', articles: [{slug: 'a', title: 'A', date: '2026-08-01'}]});
        const activeA = category({id: 2, slug: 'a', title: 'Ameisen', podcasts: [{slug: 'p', title: 'P', publishedAt: '2026-06-01'}]});
        const archived = category({id: 3, slug: 'o', title: 'Oldies', articles: [{slug: 'a', title: 'A', date: '2020-01-01'}]});

        const result = splitCategoriesByActivity([activeZ, archived, activeA], NOW);

        expect(result.active.map((c) => c.title)).toEqual(['Ameisen', 'Zebras']);
        expect(result.archived.map((c) => c.title)).toEqual(['Oldies']);
    });

    test('drops categories without any articles or podcasts', () => {
        const empty = category({id: 1, slug: 'e', title: 'Leer'});
        const emptyArrays = category({
            id: 2,
            slug: 'ea',
            title: 'Leere Arrays',
            articles: [],
            podcasts: [],
        });

        const result = splitCategoriesByActivity([empty, emptyArrays], NOW);

        expect(result.active).toEqual([]);
        expect(result.archived).toEqual([]);
    });

    test('categories with content but no valid dates land in archived', () => {
        const undated = category({id: 1, slug: 'u', title: 'Undated', articles: [{slug: 'a', title: 'A'}]});

        const result = splitCategoriesByActivity([undated], NOW);

        expect(result.active).toEqual([]);
        expect(result.archived.map((c) => c.title)).toEqual(['Undated']);
    });

    test('does not mutate the input array', () => {
        const input = [category({id: 1, slug: 'z', title: 'Zebras'}), category({id: 2, slug: 'a', title: 'Ameisen'})];

        splitCategoriesByActivity(input, NOW);

        expect(input.map((c) => c.title)).toEqual(['Zebras', 'Ameisen']);
    });
});
