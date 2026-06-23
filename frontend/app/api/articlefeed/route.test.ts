import {describe, expect, test, vi} from 'vitest';
import {GET} from './route';

const {buildArticleFeedResponse} = vi.hoisted(() => ({
    buildArticleFeedResponse: vi.fn(),
}));

vi.mock('@/src/lib/rss/articleFeedRouteHandler', () => ({
    buildArticleFeedResponse,
    getSchedulerState: vi.fn().mockReturnValue({}),
}));

describe('GET /api/articlefeed', () => {
    test('delegates to buildArticleFeedResponse with the request and returns the response', async () => {
        const mockResponse = new Response('<rss/>', {status: 200, headers: {'Content-Type': 'application/rss+xml'}});
        buildArticleFeedResponse.mockResolvedValue(mockResponse);

        const request = new Request('https://m10z.de/api/articlefeed', {method: 'GET'});
        const result = await GET(request);

        expect(buildArticleFeedResponse).toHaveBeenCalledWith(request);
        expect(result).toBe(mockResponse);
    });
});
