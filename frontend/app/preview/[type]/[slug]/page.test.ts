import {describe, expect, test, vi} from 'vitest';

vi.mock('next/navigation', () => ({
    notFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));
vi.mock('next/headers', () => ({headers: vi.fn()}));

import {classifyPreviewToken, handlePreviewFetchError, previewToken} from './page';

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

describe('previewToken', () => {
    test('binds the HMAC to the status and matches the admin handler format', async () => {
        const {createHmac} = await import('node:crypto');

        const draft = previewToken('secret', 'api::article.article', 'slug', 'draft');
        const published = previewToken('secret', 'api::article.article', 'slug', 'published');

        expect(draft).toBe(
            createHmac('sha256', 'secret').update('api::article.article:slug:draft').digest('hex'),
        );
        expect(draft).not.toBe(published);
    });
});

describe('classifyPreviewToken', () => {
    const uid = 'api::article.article';

    test('accepts the status-bound token', () => {
        expect(
            classifyPreviewToken('secret', uid, 'slug', 'draft', previewToken('secret', uid, 'slug', 'draft')),
        ).toBe('valid');
    });

    test('does not accept a token issued for the other status', () => {
        expect(
            classifyPreviewToken('secret', uid, 'slug', 'published', previewToken('secret', uid, 'slug', 'draft')),
        ).toBe('invalid');
    });

    test('recognises the legacy status-less token of a stale backend without accepting it', async () => {
        const {createHmac} = await import('node:crypto');
        const token = createHmac('sha256', 'secret').update(`${uid}:slug`).digest('hex');

        expect(classifyPreviewToken('secret', uid, 'slug', 'draft', token)).toBe('legacy');
        expect(classifyPreviewToken('secret', uid, 'slug', 'published', token)).toBe('legacy');
    });

    test('rejects a missing or foreign token', () => {
        expect(classifyPreviewToken('secret', uid, 'slug', 'draft', null)).toBe('invalid');
        expect(classifyPreviewToken('secret', uid, 'slug', 'draft', 'f'.repeat(64))).toBe('invalid');
    });
});
