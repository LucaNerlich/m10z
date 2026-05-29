import {afterEach, describe, expect, test, vi} from 'vitest';

import {isImageHostnameAllowed, normalizeSearchImageUrl, resolveStrapiImageUrl} from './index';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('resolveStrapiImageUrl', () => {
    test('returns absolute URLs unchanged', () => {
        expect(resolveStrapiImageUrl('https://cms.m10z.de/uploads/a.jpg')).toBe('https://cms.m10z.de/uploads/a.jpg');
    });

    test('prefixes relative paths with the Strapi base URL', () => {
        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de/');
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);
        expect(resolveStrapiImageUrl('/uploads/a.jpg')).toBe('https://cms.m10z.de/uploads/a.jpg');
        expect(resolveStrapiImageUrl('uploads/a.jpg')).toBe('https://cms.m10z.de/uploads/a.jpg');
    });

    test('throws for relative paths when no base URL is configured', () => {
        vi.stubEnv('STRAPI_URL', undefined);
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);
        expect(() => resolveStrapiImageUrl('/uploads/a.jpg')).toThrow(/Missing STRAPI_URL/);
    });
});

describe('normalizeSearchImageUrl', () => {
    test('returns null for falsy input', () => {
        expect(normalizeSearchImageUrl(null)).toBeNull();
        expect(normalizeSearchImageUrl(undefined)).toBeNull();
        expect(normalizeSearchImageUrl('')).toBeNull();
    });

    test('keeps already-absolute URLs', () => {
        expect(normalizeSearchImageUrl('https://cms.m10z.de/a.jpg')).toBe('https://cms.m10z.de/a.jpg');
    });

    test('uses http for localhost and loopback references', () => {
        expect(normalizeSearchImageUrl('localhost:1337/uploads/a.jpg')).toBe('http://localhost:1337/uploads/a.jpg');
        expect(normalizeSearchImageUrl('127.0.0.1:1337/a.jpg')).toBe('http://127.0.0.1:1337/a.jpg');
    });

    test('defaults to https for protocol-less hostnames', () => {
        expect(normalizeSearchImageUrl('cms.m10z.de/uploads/a.jpg')).toBe('https://cms.m10z.de/uploads/a.jpg');
    });
});

describe('isImageHostnameAllowed', () => {
    test('accepts allow-listed hosts and their subdomains', () => {
        expect(isImageHostnameAllowed('https://m10z.de/a.jpg')).toBe(true);
        expect(isImageHostnameAllowed('https://cms.m10z.de/a.jpg')).toBe(true);
        expect(isImageHostnameAllowed('https://shared.steamstatic.com/x.jpg')).toBe(true);
        expect(isImageHostnameAllowed('https://deep.sub.m10z.de/a.jpg')).toBe(true);
    });

    test('rejects unknown hosts and invalid input', () => {
        expect(isImageHostnameAllowed('https://evil.test/a.jpg')).toBe(false);
        expect(isImageHostnameAllowed('not a url')).toBe(false);
        expect(isImageHostnameAllowed(null)).toBe(false);
        expect(isImageHostnameAllowed(undefined)).toBe(false);
    });

    test('does not treat a lookalike suffix as a subdomain', () => {
        expect(isImageHostnameAllowed('https://notm10z.de/a.jpg')).toBe(false);
    });
});
