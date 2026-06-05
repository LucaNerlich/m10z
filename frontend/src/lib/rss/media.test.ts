import {afterEach, describe, expect, test, vi} from 'vitest';

import {
    getOptimalMediaFormat,
    mediaUrlToAbsolute,
    normalizeStrapiMedia,
    pickBannerMedia,
    pickBannerOrCoverMedia,
    pickCoverMedia,
    pickCoverOrBannerMedia,
    type StrapiCategoryRef,
    type StrapiContentMedia,
    type StrapiMedia,
} from './media';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('normalizeStrapiMedia', () => {
    test('returns an empty object for null/undefined', () => {
        expect(normalizeStrapiMedia(null)).toEqual({});
        expect(normalizeStrapiMedia(undefined)).toEqual({});
    });

    test('passes through a flat v5 media object', () => {
        const result = normalizeStrapiMedia({url: '/uploads/a.jpg', width: 100, mime: 'image/jpeg'});
        expect(result.url).toBe('/uploads/a.jpg');
        expect(result.width).toBe(100);
        expect(result.mime).toBe('image/jpeg');
    });

    test('unwraps the `attributes` shape', () => {
        const result = normalizeStrapiMedia({attributes: {url: '/uploads/b.jpg', width: 200}});
        expect(result.url).toBe('/uploads/b.jpg');
        expect(result.width).toBe(200);
    });

    test('unwraps the `data.attributes` shape', () => {
        const result = normalizeStrapiMedia({data: {attributes: {url: '/uploads/c.jpg', height: 300}}});
        expect(result.url).toBe('/uploads/c.jpg');
        expect(result.height).toBe(300);
    });
});

describe('mediaUrlToAbsolute', () => {
    test('returns undefined when there is no url', () => {
        expect(mediaUrlToAbsolute({media: undefined})).toBeUndefined();
        expect(mediaUrlToAbsolute({media: {}})).toBeUndefined();
    });

    test('returns absolute http(s) URLs unchanged', () => {
        expect(mediaUrlToAbsolute({media: {url: 'https://cdn.example.test/a.jpg'}})).toBe(
            'https://cdn.example.test/a.jpg'
        );
        expect(mediaUrlToAbsolute({media: {url: 'http://cdn.example.test/a.jpg'}})).toBe(
            'http://cdn.example.test/a.jpg'
        );
    });

    test('joins relative URLs with STRAPI_URL (trailing slash trimmed)', () => {
        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de/');
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);
        expect(mediaUrlToAbsolute({media: {url: '/uploads/a.jpg'}})).toBe(
            'https://cms.m10z.de/uploads/a.jpg'
        );
    });

    test('prepends a missing leading slash on the relative path', () => {
        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de');
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);
        expect(mediaUrlToAbsolute({media: {url: 'uploads/a.jpg'}})).toBe(
            'https://cms.m10z.de/uploads/a.jpg'
        );
    });

    test('falls back to NEXT_PUBLIC_STRAPI_URL when STRAPI_URL is unset', () => {
        vi.stubEnv('STRAPI_URL', undefined);
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', 'https://public.m10z.de');
        expect(mediaUrlToAbsolute({media: {url: '/uploads/a.jpg'}})).toBe(
            'https://public.m10z.de/uploads/a.jpg'
        );
    });

    test('returns undefined for a relative URL when no Strapi base URL is configured', () => {
        vi.stubEnv('STRAPI_URL', undefined);
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);
        expect(mediaUrlToAbsolute({media: {url: '/uploads/a.jpg'}})).toBeUndefined();
    });
});

describe('pick*Media fallbacks', () => {
    const content: StrapiContentMedia = {
        title: 'T',
        cover: {url: '/cover.jpg'},
        banner: {url: '/banner.jpg'},
    };
    const categories: StrapiCategoryRef[] = [{slug: 'c', cover: {url: '/cat-cover.jpg'}, banner: {url: '/cat-banner.jpg'}}];

    test('pickCoverMedia prefers the content cover', () => {
        expect(pickCoverMedia(content, categories)?.url).toBe('/cover.jpg');
    });

    test('pickCoverMedia falls back to the first category cover, then image', () => {
        expect(pickCoverMedia({title: 'T'}, categories)?.url).toBe('/cat-cover.jpg');
        expect(pickCoverMedia({title: 'T'}, [{slug: 'c', image: {url: '/cat-image.jpg'}}])?.url).toBe(
            '/cat-image.jpg'
        );
    });

    test('pickCoverMedia returns undefined when nothing matches', () => {
        expect(pickCoverMedia({title: 'T'}, [])).toBeUndefined();
        expect(pickCoverMedia(undefined, undefined)).toBeUndefined();
    });

    test('pickBannerMedia prefers the content banner, then category banner', () => {
        expect(pickBannerMedia(content, categories)?.url).toBe('/banner.jpg');
        expect(pickBannerMedia({title: 'T'}, categories)?.url).toBe('/cat-banner.jpg');
    });

    test('pickBannerOrCoverMedia prefers banner, falls back to cover', () => {
        expect(pickBannerOrCoverMedia(content, categories)?.url).toBe('/banner.jpg');
        expect(pickBannerOrCoverMedia({title: 'T', cover: {url: '/cover.jpg'}}, [])?.url).toBe('/cover.jpg');
    });

    test('pickCoverOrBannerMedia prefers cover, falls back to banner', () => {
        expect(pickCoverOrBannerMedia(content, categories)?.url).toBe('/cover.jpg');
        expect(pickCoverOrBannerMedia({title: 'T', banner: {url: '/banner.jpg'}}, [])?.url).toBe('/banner.jpg');
    });
});

describe('getOptimalMediaFormat', () => {
    const media: StrapiMedia = {
        id: 1,
        url: '/original.jpg',
        mime: 'image/jpeg',
        ext: '.jpg',
        formats: {
            small: {url: '/small.jpg', width: 500, height: 300, mime: 'image/jpeg'},
            large: {url: '/large.jpg', width: 1000, height: 600},
        },
    };

    test('returns an empty object for null/undefined input', () => {
        expect(getOptimalMediaFormat(null, 'medium')).toEqual({});
        expect(getOptimalMediaFormat(undefined, 'medium')).toEqual({});
    });

    test('returns the requested size when present', () => {
        expect(getOptimalMediaFormat(media, 'small').url).toBe('/small.jpg');
    });

    test('walks up to the next larger size when the requested one is missing', () => {
        // "medium" is absent, so it falls through to "large".
        expect(getOptimalMediaFormat(media, 'medium').url).toBe('/large.jpg');
    });

    test('inherits root metadata (mime/ext) when the format omits it', () => {
        const result = getOptimalMediaFormat(media, 'large');
        expect(result.url).toBe('/large.jpg');
        expect(result.mime).toBe('image/jpeg');
        expect(result.ext).toBe('.jpg');
    });

    test('returns the original media (without formats) when no format matches', () => {
        const result = getOptimalMediaFormat({url: '/only.jpg', formats: {}}, 'thumbnail');
        expect(result.url).toBe('/only.jpg');
        expect('formats' in result).toBe(false);
    });

    test('returns the original media (without formats) when there are no formats at all', () => {
        const result = getOptimalMediaFormat({url: '/only.jpg', mime: 'image/png'}, 'medium');
        expect(result.url).toBe('/only.jpg');
        expect(result.mime).toBe('image/png');
        expect('formats' in result).toBe(false);
    });
});
