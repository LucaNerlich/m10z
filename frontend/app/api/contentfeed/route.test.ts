import {beforeEach, describe, expect, test, vi} from 'vitest';

import {HOME_PAGE_TAG} from '@/src/lib/strapi/cacheTags';

import {GET} from './route';

const {buildContentFeed} = vi.hoisted(() => ({buildContentFeed: vi.fn()}));

vi.mock('@/src/lib/contentFeed', () => ({buildContentFeed}));

function makeRequest(search: string): Request {
    return new Request(`https://m10z.de/api/contentfeed${search}`, {method: 'GET'});
}

function feedFor(page: number, pageSize: number) {
    return {
        items: [],
        pagination: {page, pageSize, total: 0, pageCount: 1},
        hasNextPage: false,
    };
}

beforeEach(() => {
    buildContentFeed.mockReset();
    buildContentFeed.mockImplementation((page: number, pageSize: number) => feedFor(page, pageSize));
});

describe('GET /api/contentfeed', () => {
    test.each<[string, number]>([
        ['', 1], // defaults
        ['?page=1', 1],
        ['?page=3', 3],
        ['?page=2.9', 2], // floors
        ['?page=0', 1], // clamps low
        ['?page=-3', 1],
        ['?page=abc', 1], // non-numeric
        ['?page=NaN', 1],
        ['?page=Infinity', 1], // non-finite: survives Math.max/Math.floor, would serialize as null
        ['?page=-Infinity', 1],
        ['?page=1e400', 1], // Number('1e400') === Infinity
        ['?page=1e309', 1],
    ])('%s → pagination.page %i', async (search, page) => {
        const response = await GET(makeRequest(search));

        expect(response.status).toBe(200);
        expect(buildContentFeed).toHaveBeenCalledWith(page, 10, {tags: [HOME_PAGE_TAG]});
        await expect(response.json()).resolves.toEqual(feedFor(page, 10));
    });

    test.each<[string, number]>([
        ['', 10], // default
        ['?pageSize=25', 25],
        ['?pageSize=abc', 10],
        ['?pageSize=0', 10], // 0 is falsy — falls back to the default
        ['?pageSize=Infinity', 100], // already bounded: stays finite
        ['?pageSize=150', 100],
    ])('%s → pagination.pageSize %i', async (search, pageSize) => {
        const response = await GET(makeRequest(search));

        expect(response.status).toBe(200);
        expect(buildContentFeed).toHaveBeenCalledWith(1, pageSize, {tags: [HOME_PAGE_TAG]});
        await expect(response.json()).resolves.toEqual(feedFor(1, pageSize));
    });

    test('sets public caching headers on the success path', async () => {
        const response = await GET(makeRequest('?page=Infinity'));

        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=60, stale-while-revalidate=300');
    });

    test('returns a 500 JSON payload when the feed build fails', async () => {
        buildContentFeed.mockRejectedValueOnce(new Error('cms unreachable'));
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        try {
            const response = await GET(makeRequest('?page=3'));

            expect(response.status).toBe(500);
            await expect(response.json()).resolves.toEqual({error: 'Failed to fetch content feed'});
        } finally {
            consoleError.mockRestore();
        }
    });
});
