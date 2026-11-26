import {describe, expect, test} from 'vitest';

import {resolveAnchorTarget} from './anchorTarget';

const SITE = 'https://m10z.de';

describe('resolveAnchorTarget', () => {
    test('treats a site-relative path as internal', () => {
        expect(resolveAnchorTarget('/artikel/foo', SITE)).toEqual({isInternal: true, isExternalWeb: false, href: '/artikel/foo'});
    });

    test('normalizes a trailing slash on internal paths', () => {
        expect(resolveAnchorTarget('/artikel/foo/', SITE)).toEqual({isInternal: true, isExternalWeb: false, href: '/artikel/foo'});
    });

    test('keeps the root path intact', () => {
        expect(resolveAnchorTarget('/', SITE)).toEqual({isInternal: true, isExternalWeb: false, href: '/'});
    });

    test('preserves query and hash on internal paths', () => {
        expect(resolveAnchorTarget('/artikel/foo?x=1#top', SITE)).toEqual({
            isInternal: true,
            isExternalWeb: false,
            href: '/artikel/foo?x=1#top',
        });
    });

    test('treats an absolute same-origin URL as internal', () => {
        expect(resolveAnchorTarget('https://m10z.de/artikel/foo', SITE)).toEqual({
            isInternal: true,
            isExternalWeb: false,
            href: '/artikel/foo',
        });
    });

    test('treats a protocol-relative cross-origin URL as an external web link', () => {
        expect(resolveAnchorTarget('//evil.com/x', SITE)).toEqual({isInternal: false, isExternalWeb: true, href: '//evil.com/x'});
    });

    // Regression: URL parsing normalizes "\" to "/" for http(s), so this is a
    // cross-origin URL that must not take the internal fast path.
    test('treats a leading backslash as a cross-origin URL, not an internal path', () => {
        expect(resolveAnchorTarget('/\\evil.com', SITE)).toEqual({isInternal: false, isExternalWeb: true, href: '/\\evil.com'});
        expect(resolveAnchorTarget('/\\/evil.com/x', SITE)).toEqual({isInternal: false, isExternalWeb: true, href: '/\\/evil.com/x'});
    });

    test('treats a different origin as an external web link', () => {
        expect(resolveAnchorTarget('https://evil.com/x', SITE)).toEqual({isInternal: false, isExternalWeb: true, href: 'https://evil.com/x'});
    });

    test('treats a same-origin subdomain-lookalike as an external web link', () => {
        expect(resolveAnchorTarget('https://m10z.de.evil.com/x', SITE)).toEqual({
            isInternal: false,
            isExternalWeb: true,
            href: 'https://m10z.de.evil.com/x',
        });
    });

    test('resolves a relative path without a leading slash as internal', () => {
        expect(resolveAnchorTarget('artikel/foo', SITE)).toEqual({isInternal: true, isExternalWeb: false, href: '/artikel/foo'});
    });

    test('keeps non-web schemes neither internal nor external web links', () => {
        expect(resolveAnchorTarget('mailto:hi@m10z.de', SITE)).toEqual({
            isInternal: false,
            isExternalWeb: false,
            href: 'mailto:hi@m10z.de',
        });
        expect(resolveAnchorTarget('tel:+4912345', SITE)).toEqual({
            isInternal: false,
            isExternalWeb: false,
            href: 'tel:+4912345',
        });
        expect(resolveAnchorTarget('javascript:alert(1)', SITE)).toEqual({
            isInternal: false,
            isExternalWeb: false,
            href: 'javascript:alert(1)',
        });
    });
});
