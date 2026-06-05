import {describe, expect, test} from 'vitest';

import {
    buildAuthorPageTags,
    clampPage,
    clampPageSize,
    normalizePagination,
    toPaginatedResult,
} from './strapiContent';

describe('clampPage', () => {
    test.each([
        [0, 1],
        [-5, 1],
        [1, 1],
        [2.9, 2],
        [3, 3],
    ])('%d → %d', (input, expected) => {
        expect(clampPage(input)).toBe(expected);
    });
});

describe('clampPageSize', () => {
    test.each([
        [0, 1],
        [-1, 1],
        [1, 1],
        [50, 50],
        [200, 200],
        [250, 200],
        [20.7, 20],
    ])('%d → %d', (input, expected) => {
        expect(clampPageSize(input)).toBe(expected);
    });
});

describe('normalizePagination', () => {
    test('uses fallbacks when meta is missing', () => {
        expect(normalizePagination(undefined, 2, 25)).toEqual({page: 2, pageSize: 25, total: 0, pageCount: 1});
    });

    test('clamps pageSize to 200', () => {
        expect(normalizePagination({pagination: {pageSize: 500}}, 1, 20).pageSize).toBe(200);
    });

    test('derives pageCount from total/pageSize when absent', () => {
        expect(normalizePagination({pagination: {page: 1, pageSize: 10, total: 25}}, 1, 10).pageCount).toBe(3);
    });

    test('honors an explicit pageCount', () => {
        expect(
            normalizePagination({pagination: {page: 1, pageSize: 10, total: 25, pageCount: 5}}, 1, 10).pageCount,
        ).toBe(5);
    });
});

describe('toPaginatedResult', () => {
    test('hasNextPage is true when page < pageCount', () => {
        const r = toPaginatedResult({data: [1, 2], meta: {pagination: {page: 1, pageSize: 2, total: 6, pageCount: 3}}}, 1, 2);
        expect(r.items).toEqual([1, 2]);
        expect(r.hasNextPage).toBe(true);
    });

    test('hasNextPage is false on the last page; items default to []', () => {
        const r = toPaginatedResult({meta: {pagination: {page: 3, pageSize: 2, total: 6, pageCount: 3}}}, 3, 2);
        expect(r.items).toEqual([]);
        expect(r.hasNextPage).toBe(false);
    });
});

describe('buildAuthorPageTags', () => {
    test('builds the base hierarchy without a category', () => {
        expect(buildAuthorPageTags({contentType: 'article', authorSlug: 'jane'})).toEqual([
            'strapi:article',
            'strapi:article:list',
            'strapi:author',
            'strapi:author:jane',
            'strapi:article:list:author:jane',
            'strapi:article:list:author:jane:page',
        ]);
    });

    test('adds category tags when a category is given', () => {
        const tags = buildAuthorPageTags({contentType: 'podcast', authorSlug: 'jane', categorySlug: 'news'});
        expect(tags).toContain('strapi:category');
        expect(tags).toContain('strapi:category:news');
        expect(tags).toContain('strapi:podcast:list:author:jane:category:news');
        expect(tags).toContain('strapi:podcast:list:author:jane:category:news:page');
    });
});
