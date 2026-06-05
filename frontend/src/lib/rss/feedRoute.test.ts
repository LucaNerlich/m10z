import {describe, expect, test} from 'vitest';

import {buildRssHeaders, fallbackFeedXml, maybeReturn304, normalizeBaseUrl} from './feedRoute';

describe('normalizeBaseUrl', () => {
    test('trims one or more trailing slashes', () => {
        expect(normalizeBaseUrl('https://m10z.de/')).toBe('https://m10z.de');
        expect(normalizeBaseUrl('https://m10z.de///')).toBe('https://m10z.de');
    });

    test('leaves a URL without a trailing slash unchanged', () => {
        expect(normalizeBaseUrl('https://m10z.de')).toBe('https://m10z.de');
    });
});

describe('buildRssHeaders', () => {
    test('sets sensible XML defaults', () => {
        const headers = buildRssHeaders({});
        expect(headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
        expect(headers.get('Cache-Control')).toBe('public, max-age=3600, must-revalidate');
        expect(headers.get('Content-Disposition')).toBe('inline');
        expect(headers.get('ETag')).toBeNull();
        expect(headers.get('Last-Modified')).toBeNull();
    });

    test('honors overrides and optional fields', () => {
        const lastModified = new Date('2026-04-20T09:00:00.000Z');
        const headers = buildRssHeaders({
            etag: '"abc"',
            contentDisposition: 'attachment',
            cacheControl: 'no-store',
            lastModified,
        });
        expect(headers.get('Cache-Control')).toBe('no-store');
        expect(headers.get('Content-Disposition')).toBe('attachment');
        expect(headers.get('ETag')).toBe('"abc"');
        expect(headers.get('Last-Modified')).toBe('Mon, 20 Apr 2026 09:00:00 GMT');
    });
});

describe('maybeReturn304', () => {
    const headers = new Headers({ETag: '"v1"'});

    function requestWith(ifNoneMatch?: string): Request {
        return new Request('https://m10z.de/rss.xml', {
            headers: ifNoneMatch ? {'if-none-match': ifNoneMatch} : {},
        });
    }

    test('returns null when no etag or headers are provided', () => {
        expect(maybeReturn304(requestWith('"v1"'), undefined, headers)).toBeNull();
        expect(maybeReturn304(requestWith('"v1"'), '"v1"', undefined)).toBeNull();
    });

    test('returns null when the request has no If-None-Match header', () => {
        expect(maybeReturn304(requestWith(), '"v1"', headers)).toBeNull();
    });

    test('returns a 304 response when the etag matches', () => {
        const res = maybeReturn304(requestWith('"v1"'), '"v1"', headers);
        expect(res?.status).toBe(304);
    });

    test('matches against a comma-separated If-None-Match list', () => {
        const res = maybeReturn304(requestWith('"v0", "v1", "v2"'), '"v1"', headers);
        expect(res?.status).toBe(304);
    });

    test('returns null when the etag does not match', () => {
        expect(maybeReturn304(requestWith('"other"'), '"v1"', headers)).toBeNull();
    });
});

describe('fallbackFeedXml', () => {
    test('builds a minimal RSS document with escaped values', () => {
        const xml = fallbackFeedXml({
            title: 'M10Z & Friends',
            link: 'https://m10z.de',
            selfLink: 'https://m10z.de/rss.xml',
            description: 'desc',
        });
        expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(xml).toContain('<rss version="2.0"');
        expect(xml).toContain('<title>M10Z &amp; Friends</title>');
        expect(xml).toContain('<atom:link href="https://m10z.de/rss.xml" rel="self" type="application/rss+xml"/>');
    });
});
