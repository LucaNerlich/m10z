import {afterEach, describe, expect, test, vi} from 'vitest';

import {formatOpenGraphImage} from './formatters';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('formatOpenGraphImage', () => {
    test('returns undefined when no media is provided', () => {
        expect(formatOpenGraphImage(undefined)).toBeUndefined();
    });

    test('returns undefined when the url cannot be resolved', () => {
        vi.stubEnv('STRAPI_URL', undefined);
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);
        expect(formatOpenGraphImage({url: '/uploads/relative.jpg'})).toBeUndefined();
    });

    test('maps an absolute media URL to a single OG image object', () => {
        const result = formatOpenGraphImage({
            url: 'https://cdn.example.test/a.jpg',
            alternativeText: 'Alt text',
            width: 1200,
            height: 630,
        });
        expect(result).toEqual([
            {url: 'https://cdn.example.test/a.jpg', alt: 'Alt text', width: 1200, height: 630},
        ]);
    });

    test('falls back to caption for alt and omits dimensions when incomplete', () => {
        const result = formatOpenGraphImage({url: 'https://cdn.example.test/a.jpg', caption: 'A caption', width: 1200});
        expect(result).toEqual([{url: 'https://cdn.example.test/a.jpg', alt: 'A caption'}]);
    });
});
