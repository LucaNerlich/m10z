import {beforeEach, describe, expect, test, vi} from 'vitest';

import {GET} from '@/app/api/search-index/route';
import {SearchIndexFetchError, SearchIndexValidationError} from '@/src/lib/search/searchIndexService';

const mocks = vi.hoisted(() => ({
    loadSearchIndex: vi.fn(),
    augmentIndexWithStaticPages: vi.fn(),
    stripRecordContent: vi.fn(),
    getCachedFuse: vi.fn(),
}));

vi.mock('@/src/lib/search/searchIndexService', () => ({
    loadSearchIndex: mocks.loadSearchIndex,
    augmentIndexWithStaticPages: mocks.augmentIndexWithStaticPages,
    stripRecordContent: mocks.stripRecordContent,
    getCachedFuse: mocks.getCachedFuse,
    SearchIndexFetchError: class SearchIndexFetchError extends Error {},
    SearchIndexValidationError: class SearchIndexValidationError extends Error {},
}));

beforeEach(() => {
    mocks.loadSearchIndex.mockReset();
    mocks.loadSearchIndex.mockResolvedValue({
        records: [],
        total: 0,
        version: '2026-01-01T00:00:00.000Z',
        generatedAt: '2026-01-01T00:00:00.000Z',
    });
    mocks.augmentIndexWithStaticPages.mockImplementation((index: unknown) => index);
    mocks.stripRecordContent.mockImplementation((records: unknown) => records);
});

describe('search-index route rate limiting', () => {
    test('consults the limiter on the full-index branch', async () => {
        const headers = {'x-forwarded-for': '203.0.113.42'};

        let status = 0;
        let retryAfter: string | null = null;
        for (let i = 0; i < 101; i++) {
            const response = await GET(new Request('https://m10z.de/api/search-index', {headers}));
            status = response.status;
            retryAfter = response.headers.get('Retry-After');
        }

        // More than 100 requests per minute from one IP must 429 even without `q`.
        expect(status).toBe(429);
        expect(retryAfter).toBeTruthy();
    });
});

describe('search-index route error mapping', () => {
    const cases = [
        {label: 'fetch', make: () => new SearchIndexFetchError('down'), status: 502},
        {label: 'validation', make: () => new SearchIndexValidationError('bad'), status: 500},
        {label: 'unexpected', make: () => new Error('boom'), status: 500},
    ] as const;

    for (const path of ['/api/search-index', '/api/search-index?q=test']) {
        for (const [index, entry] of cases.entries()) {
            test(`${path} ${entry.label} -> ${entry.status}`, async () => {
                mocks.loadSearchIndex.mockRejectedValue(entry.make());

                const response = await GET(
                    new Request(`https://m10z.de${path}`, {
                        headers: {'x-forwarded-for': `198.51.100.${index + 10}`},
                    }),
                );

                expect(response.status).toBe(entry.status);
            });
        }
    }
});
