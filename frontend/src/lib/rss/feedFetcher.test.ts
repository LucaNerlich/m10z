import {describe, expect, test} from 'vitest';

import {fetchAllPaginated, type StrapiFeedFetcher} from './feedFetcher';

type PageDef = {data: unknown[]; pageCount: number; total?: number};

// Fake fetcher backed by a page→response map; reads `page=N` from the query.
function makeFetcher(pages: Record<number, PageDef>): {fetcher: StrapiFeedFetcher; calls: string[]} {
    const calls: string[] = [];
    const fetcher: StrapiFeedFetcher = async <T>(pathWithQuery: string): Promise<T> => {
        calls.push(pathWithQuery);
        const page = Number(pathWithQuery.match(/page=(\d+)/)?.[1] ?? 1);
        const def = pages[page] ?? {data: [], pageCount: 1};
        return {
            data: def.data,
            meta: {pagination: {page, pageCount: def.pageCount, total: def.total ?? 0}},
        } as T;
    };
    return {fetcher, calls};
}

const buildQueryString = (page: number, pageSize: number) => `page=${page}&size=${pageSize}`;

describe('fetchAllPaginated', () => {
    test('returns a single page when pageCount is 1', async () => {
        const {fetcher, calls} = makeFetcher({1: {data: ['a', 'b'], pageCount: 1}});
        const items = await fetchAllPaginated<string>({fetcher, apiBasePath: '/api/articles', buildQueryString});
        expect(items).toEqual(['a', 'b']);
        expect(calls).toHaveLength(1);
    });

    test('accumulates subsequent pages', async () => {
        const {fetcher, calls} = makeFetcher({
            1: {data: ['a', 'b'], pageCount: 3},
            2: {data: ['c', 'd'], pageCount: 3},
            3: {data: ['e'], pageCount: 3},
        });
        const items = await fetchAllPaginated<string>({fetcher, apiBasePath: '/api/x', buildQueryString});
        expect(items).toEqual(['a', 'b', 'c', 'd', 'e']);
        expect(calls).toHaveLength(3);
    });

    test('caps total items at resolveMaxItems', async () => {
        const {fetcher} = makeFetcher({
            1: {data: ['a', 'b'], pageCount: 3},
            2: {data: ['c', 'd'], pageCount: 3},
            3: {data: ['e', 'f'], pageCount: 3},
        });
        const items = await fetchAllPaginated<string>({
            fetcher,
            apiBasePath: '/api/x',
            buildQueryString,
            resolveMaxItems: () => 3,
        });
        expect(items).toEqual(['a', 'b', 'c']);
    });

    test('caps page requests at maxPages', async () => {
        const {fetcher, calls} = makeFetcher({
            1: {data: ['a'], pageCount: 10},
            2: {data: ['b'], pageCount: 10},
        });
        const items = await fetchAllPaginated<string>({
            fetcher,
            apiBasePath: '/api/x',
            buildQueryString,
            maxPages: 2,
        });
        expect(items).toEqual(['a', 'b']);
        expect(calls).toHaveLength(2);
    });

    test('stops when the first page is empty', async () => {
        const {fetcher, calls} = makeFetcher({1: {data: [], pageCount: 5}});
        const items = await fetchAllPaginated<string>({fetcher, apiBasePath: '/api/x', buildQueryString});
        expect(items).toEqual([]);
        expect(calls).toHaveLength(1);
    });

    test('returns the first page when pagination meta is missing', async () => {
        const calls: string[] = [];
        const fetcher: StrapiFeedFetcher = async <T>(pathWithQuery: string): Promise<T> => {
            calls.push(pathWithQuery);
            return {data: ['only']} as T; // no meta
        };
        const items = await fetchAllPaginated<string>({fetcher, apiBasePath: '/api/x', buildQueryString});
        expect(items).toEqual(['only']);
        expect(calls).toHaveLength(1);
    });
});
