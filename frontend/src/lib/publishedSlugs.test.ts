import {afterEach, describe, expect, test} from 'vitest';

import {fetchPublishedSlugs} from './publishedSlugs';
import {__resetStrapiTransport, __setStrapiTransport, type StrapiRequest} from './strapiTransport';

type SlugRow = {slug?: string; updatedAt?: string | null; publishedAt?: string | null};
type PageDef = {data: SlugRow[]; pageCount: number};

// In-memory transport keyed by the `pagination[page]=N` in the request path.
function mockTransport(pages: Record<number, PageDef>): StrapiRequest[] {
    const seen: StrapiRequest[] = [];
    __setStrapiTransport(async <T>(req: StrapiRequest): Promise<T> => {
        seen.push(req);
        const page = Number(req.path.match(/pagination\[page\]=(\d+)/)?.[1] ?? 1);
        const def = pages[page] ?? {data: [], pageCount: 1};
        return {
            data: def.data,
            meta: {pagination: {page, pageSize: 100, pageCount: def.pageCount, total: def.data.length}},
        } as T;
    });
    return seen;
}

afterEach(() => __resetStrapiTransport());

describe('fetchPublishedSlugs', () => {
    test('maps slugs and skips rows missing slug or publishedAt', async () => {
        mockTransport({
            1: {
                pageCount: 1,
                data: [
                    {slug: 'a', publishedAt: '2025-01-01', updatedAt: '2025-02-01'},
                    {slug: '', publishedAt: '2025-01-01'},
                    {slug: 'c', publishedAt: null},
                ],
            },
        });
        const entries = await fetchPublishedSlugs('articles', ['t']);
        expect(entries).toEqual([{slug: 'a', lastModified: '2025-02-01'}]);
    });

    test('prefers updatedAt over publishedAt, falling back to publishedAt', async () => {
        mockTransport({
            1: {
                pageCount: 1,
                data: [
                    {slug: 'a', publishedAt: '2025-01-01', updatedAt: '2025-03-01'},
                    {slug: 'b', publishedAt: '2025-01-02'},
                ],
            },
        });
        const entries = await fetchPublishedSlugs('articles', ['t']);
        expect(entries).toEqual([
            {slug: 'a', lastModified: '2025-03-01'},
            {slug: 'b', lastModified: '2025-01-02'},
        ]);
    });

    test('paginates across pages, requesting each once in order', async () => {
        const seen = mockTransport({
            1: {pageCount: 2, data: [{slug: 'a', publishedAt: '2025-01-01'}]},
            2: {pageCount: 2, data: [{slug: 'b', publishedAt: '2025-01-02'}]},
        });
        const entries = await fetchPublishedSlugs('podcasts', ['t']);
        expect(entries.map((e) => e.slug)).toEqual(['a', 'b']);
        expect(seen.map((r) => r.path.match(/pagination\[page\]=(\d+)/)?.[1])).toEqual(['1', '2']);
    });

    test('stops on an empty page despite a higher pageCount', async () => {
        const seen = mockTransport({1: {pageCount: 5, data: []}});
        const entries = await fetchPublishedSlugs('articles', ['t']);
        expect(entries).toEqual([]);
        expect(seen).toHaveLength(1);
    });
});
