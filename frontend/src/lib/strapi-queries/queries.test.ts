import qs from 'qs';
import {describe, expect, test} from 'vitest';

import {buildBySlugQuery, buildBySlugsQuery, buildListQuery} from './queries';

describe('buildBySlugQuery', () => {
    test('builds an $eq slug filter with pageSize 1', () => {
        const query = buildBySlugQuery({
            slug: 'hello-world',
            populate: {cover: true},
            fields: ['slug', 'title'],
            status: 'published',
        });
        expect(qs.parse(query)).toEqual({
            filters: {slug: {$eq: 'hello-world'}},
            status: 'published',
            populate: {cover: 'true'},
            fields: ['slug', 'title'],
            pagination: {pageSize: '1'},
        });
    });

    test('omits status when not provided', () => {
        const query = buildBySlugQuery({slug: 'a', populate: {}, fields: ['slug']});
        expect(query).not.toContain('status=');
    });
});

describe('buildBySlugsQuery', () => {
    test('builds an $in slug filter with the given pageSize', () => {
        const query = buildBySlugsQuery({
            slugs: ['a', 'b', 'c'],
            pageSize: 150,
            populate: {},
            fields: ['slug'],
            status: 'draft',
        });
        expect(qs.parse(query)).toEqual({
            filters: {slug: {$in: ['a', 'b', 'c']}},
            status: 'draft',
            fields: ['slug'],
            pagination: {pageSize: '150'},
        });
    });
});

describe('buildListQuery', () => {
    test('builds a paginated list query with sort', () => {
        const query = buildListQuery({
            page: 2,
            pageSize: 10,
            populate: {cover: true},
            fields: ['slug', 'title'],
            sort: ['publishedAt:desc'],
            status: 'published',
        });
        expect(qs.parse(query)).toEqual({
            sort: ['publishedAt:desc'],
            status: 'published',
            pagination: {pageSize: '10', page: '2'},
            populate: {cover: 'true'},
            fields: ['slug', 'title'],
        });
    });

    test('includes custom filters only when provided', () => {
        const withFilters = buildListQuery({
            page: 1,
            pageSize: 25,
            populate: {},
            fields: ['slug'],
            filters: {categories: {slug: {$eq: 'news'}}},
        });
        expect(qs.parse(withFilters).filters).toEqual({categories: {slug: {$eq: 'news'}}});

        const withoutFilters = buildListQuery({page: 1, pageSize: 25, populate: {}, fields: ['slug']});
        expect(withoutFilters).not.toContain('filters');
    });
});
