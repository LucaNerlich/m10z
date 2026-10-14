import {describe, expect, test, vi} from 'vitest';

import {createPrivilegedFeedReader, fetchStrapiCollection, fetchStrapiSingle, readApiPath} from '@/src/lib/strapi/contentAccess';

const strapiFetchMock = vi.hoisted(() => vi.fn());

vi.mock('@/src/lib/strapiTransport', () => ({
    strapiFetch: strapiFetchMock,
}));

describe('contentAccess read interface', () => {
    test('fetchStrapiCollection normalises endpoint to /api path', async () => {
        strapiFetchMock.mockResolvedValueOnce({data: [], meta: {}});
        await fetchStrapiCollection('articles', 'filters[slug][$eq]=foo', {tags: ['strapi:article']});
        expect(strapiFetchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                path: '/api/articles?filters[slug][$eq]=foo',
                diagnosticName: 'strapi.fetchStrapiCollection',
            }),
        );
    });

    test('fetchStrapiSingle normalises endpoint to /api path', async () => {
        strapiFetchMock.mockResolvedValueOnce({data: {}, meta: {}});
        await fetchStrapiSingle('about', '', {tags: ['strapi:about']});
        expect(strapiFetchMock).toHaveBeenCalledWith(
            expect.objectContaining({path: '/api/about', diagnosticName: 'strapi.fetchStrapiSingle'}),
        );
    });

    test('a read without tags still passes an empty tag list to the transport', async () => {
        strapiFetchMock.mockResolvedValueOnce({data: {}});
        await fetchStrapiSingle('about');
        expect(strapiFetchMock).toHaveBeenCalledWith(
            expect.objectContaining({cache: {mode: 'tags', tags: [], revalidate: undefined}}),
        );
    });

    test('readApiPath accepts full /api paths', async () => {
        strapiFetchMock.mockResolvedValueOnce({data: []});
        await readApiPath('/api/authors?pagination[pageSize]=1', {tags: ['strapi:author']});
        expect(strapiFetchMock).toHaveBeenCalledWith(
            expect.objectContaining({path: '/api/authors?pagination[pageSize]=1'}),
        );
    });

    test('createPrivilegedFeedReader uses privileged auth', async () => {
        strapiFetchMock.mockResolvedValueOnce({});
        const fetcher = createPrivilegedFeedReader(['feed:article']);
        await fetcher('/api/articles?page=1');
        expect(strapiFetchMock).toHaveBeenCalledWith(
            expect.objectContaining({auth: 'privileged', diagnosticName: 'strapi.feed'}),
        );
    });
});
