import {beforeEach, describe, expect, test, vi} from 'vitest';

const {buildContentFeed} = vi.hoisted(() => ({buildContentFeed: vi.fn()}));

vi.mock('@/src/lib/contentFeed', () => ({buildContentFeed}));

import {GET} from './route';

function responseFor(page: number, pageSize: number) {
    return {
        items: [],
        pagination: {page, pageSize, total: 0, pageCount: 1, hasNextPage: false},
    };
}

function request(query: string): Request {
    return new Request(`https://m10z.de/api/contentfeed${query}`);
}

describe('GET /api/contentfeed', () => {
    beforeEach(() => {
        buildContentFeed.mockReset();
        buildContentFeed.mockImplementation(async (page: number, pageSize: number) =>
            responseFor(page, pageSize),
        );
    });

    test('defaults to page 1 / pageSize 10', async () => {
        const res = await GET(request(''));
        expect(buildContentFeed).toHaveBeenCalledWith(1, 10, expect.anything());
        expect(res.status).toBe(200);
    });

    test('a non-finite page is clamped instead of serialising as null', async () => {
        for (const raw of ['Infinity', '-Infinity', '1e400', 'abc', 'NaN']) {
            buildContentFeed.mockClear();
            const res = await GET(request(`?page=${raw}`));
            expect(buildContentFeed, `?page=${raw}`).toHaveBeenCalledWith(1, 10, expect.anything());
            const body = await res.json();
            expect(body.pagination.page).toBe(1);
            expect(body.pagination.page).not.toBeNull();
        }
    });

    test('pageSize is clamped to 100 and floor 1', async () => {
        await GET(request('?pageSize=Infinity'));
        expect(buildContentFeed).toHaveBeenCalledWith(1, 100, expect.anything());

        buildContentFeed.mockClear();
        await GET(request('?pageSize=0'));
        expect(buildContentFeed).toHaveBeenCalledWith(1, 10, expect.anything());
    });
});
