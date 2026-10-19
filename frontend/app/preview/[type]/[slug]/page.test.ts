import {describe, expect, test, vi} from 'vitest';

vi.mock('next/navigation', () => ({
    notFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));
vi.mock('next/headers', () => ({headers: vi.fn()}));

import {handlePreviewFetchError} from './page';

describe('handlePreviewFetchError', () => {
    test('returns null only for a genuine 404', () => {
        const notFoundError = Object.assign(new Error('not found'), {status: 404});
        expect(handlePreviewFetchError(notFoundError, 'slug', 'article')).toBeNull();
    });

    test('rethrows a transient 5xx instead of rendering a 404', () => {
        const failure = Object.assign(new Error('Strapi 500'), {status: 500});
        expect(() => handlePreviewFetchError(failure, 'slug', 'article')).toThrow('Strapi 500');
    });

    test('rethrows a missing-token configuration error', () => {
        const failure = new Error('STRAPI_API_TOKEN is required for privileged Strapi reads');
        expect(() => handlePreviewFetchError(failure, 'slug', 'article')).toThrow(
            /STRAPI_API_TOKEN/,
        );
    });
});
