import {matchRemotePattern} from 'next/dist/shared/lib/match-remote-pattern';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {ALLOWED_IMAGE_HOSTNAMES, allowLocalImageIp, getCspImageSources, getRemotePatterns, isImageHostnameAllowed, normalizeSearchImageUrl, resolveStrapiImageUrl} from './index';

afterEach(() => {
    vi.unstubAllEnvs();
});

/** Whether the Next image optimizer's `remotePatterns` would fetch this URL. */
function optimizerAccepts(url: string): boolean {
    const parsed = new URL(url);
    return getRemotePatterns().some((pattern) => matchRemotePattern(pattern, parsed));
}

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

    test('rejects http on a public allow-listed host, matching the optimizer', () => {
        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de');
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);
        expect(isImageHostnameAllowed('http://cms.m10z.de/a.jpg')).toBe(false);
    });

    test('rejects a non-local configured origin that the optimizer does not permit', () => {
        vi.stubEnv('STRAPI_URL', 'https://staging.example.com');
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);
        const url = 'https://staging.example.com/uploads/a.jpg';

        expect(isImageHostnameAllowed(url)).toBe(false);
        expect(optimizerAccepts(url)).toBe(false);
    });

    test('accepts the configured local Strapi origin over http', () => {
        vi.stubEnv('STRAPI_URL', 'http://127.0.0.1:1337');
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);
        expect(isImageHostnameAllowed('http://127.0.0.1:1337/uploads/a.jpg')).toBe(true);
        expect(isImageHostnameAllowed('http://localhost:3000/a.jpg')).toBe(false);
    });
});

describe('getCspImageSources', () => {
    test('emits the bare host and its wildcard subdomain form for every allowed host', () => {
        const sources = getCspImageSources();

        // CSP host-sources are exact: the bare host does not cover subdomains,
        // and `*.host` does not cover the host itself, so both must be present.
        expect(sources).toContain('https://m10z.de');
        expect(sources).toContain('https://*.m10z.de');
        expect(sources).toContain('https://cdn.akamai.steamstatic.com');
        expect(sources).toContain('https://*.cdn.akamai.steamstatic.com');

        // Development-only host stays out of the production CSP.
        expect(sources).not.toContain('https://localhost');
        expect(new Set(sources).size).toBe(sources.length);
    });
});

describe('getRemotePatterns', () => {
    test('emits a subdomain pattern alongside each bare allow-listed host', () => {
        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de');
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);
        const patterns = getRemotePatterns();
        expect(patterns).toContainEqual({protocol: 'https', hostname: 'm10z.de'});
        expect(patterns).toContainEqual({protocol: 'https', hostname: '**.m10z.de'});
    });

    test('the optimizer accepts every host (and subdomain) the runtime gate accepts', () => {
        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de');
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);

        // `localhost` is deliberately excluded: the runtime allowlist carries it,
        // but the optimizer may only fetch a local origin when STRAPI_URL points
        // at one (asserted below).
        const positives = ALLOWED_IMAGE_HOSTNAMES.filter((hostname) => hostname !== 'localhost').flatMap(
            (hostname) => [`https://${hostname}/x.jpg`, `https://sub.${hostname}/x.jpg`],
        );

        for (const url of positives) {
            expect(isImageHostnameAllowed(url)).toBe(true);
            expect(optimizerAccepts(url)).toBe(true);
        }

        for (const url of ['https://www.m10z.de/x.jpg', 'https://foo.cdn.akamai.steamstatic.com/x.jpg']) {
            expect(isImageHostnameAllowed(url)).toBe(true);
            expect(optimizerAccepts(url)).toBe(true);
        }

        for (const url of ['https://notm10z.de/x.jpg', 'https://evil.test/x.jpg']) {
            expect(isImageHostnameAllowed(url)).toBe(false);
            expect(optimizerAccepts(url)).toBe(false);
        }
    });

    test('excludes local hosts when STRAPI_URL is a public origin', () => {
        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de');
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);
        const patterns = getRemotePatterns();
        expect(patterns.some((p) => p.hostname === 'localhost')).toBe(false);
        expect(patterns).toContainEqual({protocol: 'https', hostname: 'cms.m10z.de'});
    });

    test('includes the exact local origin when STRAPI_URL points at localhost', () => {
        vi.stubEnv('STRAPI_URL', 'http://localhost:1337');
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);
        const patterns = getRemotePatterns();
        expect(patterns).toContainEqual({protocol: 'http', hostname: 'localhost', port: '1337'});
        expect(patterns.filter((p) => p.hostname === 'localhost')).toHaveLength(1);
    });

    test('includes loopback origin with its port when configured', () => {
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', 'http://127.0.0.1:1338');
        vi.stubEnv('STRAPI_URL', undefined);
        const patterns = getRemotePatterns();
        expect(patterns).toContainEqual({protocol: 'http', hostname: '127.0.0.1', port: '1338'});
    });

    test('returns no local pattern when no Strapi URL is configured', () => {
        vi.stubEnv('STRAPI_URL', undefined);
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);
        expect(getRemotePatterns().some((p) => p.hostname === 'localhost')).toBe(false);
    });
});

describe('allowLocalImageIp', () => {
    test('true only when the configured Strapi origin is local', () => {
        vi.stubEnv('STRAPI_URL', 'http://localhost:1337');
        vi.stubEnv('NEXT_PUBLIC_STRAPI_URL', undefined);
        expect(allowLocalImageIp()).toBe(true);

        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de');
        expect(allowLocalImageIp()).toBe(false);

        vi.stubEnv('STRAPI_URL', undefined);
        expect(allowLocalImageIp()).toBe(false);
    });
});
