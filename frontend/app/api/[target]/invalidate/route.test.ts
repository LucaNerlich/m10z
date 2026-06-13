import {describe, expect, test, vi} from 'vitest';

const {handleInvalidation} = vi.hoisted(() => ({
    handleInvalidation: vi.fn(),
}));

vi.mock('@/src/lib/cache/handleInvalidation', () => ({handleInvalidation}));

import {POST} from './route';

describe('POST /api/[target]/invalidate', () => {
    test('delegates to handleInvalidation with the resolved target param and returns its response', async () => {
        const mockResponse = new Response('ok', {status: 200});
        handleInvalidation.mockResolvedValue(mockResponse);

        const request = new Request('https://m10z.de/api/article/invalidate', {method: 'POST'});
        const params = Promise.resolve({target: 'article'});

        const result = await POST(request, {params});

        expect(handleInvalidation).toHaveBeenCalledWith(request, 'article');
        expect(result).toBe(mockResponse);
    });
});
