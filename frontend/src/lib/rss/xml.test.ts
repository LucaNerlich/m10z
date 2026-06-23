import crypto from 'node:crypto';

import {describe, expect, test} from 'vitest';

import {escapeCdata, escapeXml, formatRssDate, sha256Hex} from './xml';

describe('escapeXml', () => {
    test('escapes all five XML metacharacters', () => {
        expect(escapeXml(`<a href="x">Tom & Jerry's</a>`)).toBe(
            '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;',
        );
    });

    test('escapes ampersand first so entities are not double-escaped incorrectly', () => {
        // A literal "&lt;" must become "&amp;lt;", not "&lt;".
        expect(escapeXml('&lt;')).toBe('&amp;lt;');
    });

    test('leaves plain text untouched', () => {
        expect(escapeXml('Mindestens 10 Zeichen')).toBe('Mindestens 10 Zeichen');
    });

    test('returns empty string for empty input', () => {
        expect(escapeXml('')).toBe('');
    });
});

describe('escapeCdata', () => {
    test('splits the CDATA terminator sequence safely', () => {
        expect(escapeCdata('a]]>b')).toBe('a]]]]><![CDATA[>b');
    });

    test('handles multiple terminators', () => {
        expect(escapeCdata(']]>]]>')).toBe(']]]]><![CDATA[>]]]]><![CDATA[>');
    });

    test('leaves content without the terminator untouched', () => {
        expect(escapeCdata('<p>hello</p>')).toBe('<p>hello</p>');
    });
});

describe('sha256Hex', () => {
    test('matches the well-known SHA-256 digest of "abc"', () => {
        expect(sha256Hex('abc')).toBe(
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        );
    });

    test('matches the SHA-256 digest of the empty string', () => {
        expect(sha256Hex('')).toBe(
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        );
    });

    test('is deterministic and agrees with node crypto', () => {
        const input = 'https://m10z.de/artikel/some-slug';
        const expected = crypto.createHash('sha256').update(input).digest('hex');
        expect(sha256Hex(input)).toBe(expected);
        expect(sha256Hex(input)).toBe(sha256Hex(input));
    });
});

describe('formatRssDate', () => {
    test('produces an RFC-2822 / UTC string', () => {
        const date = new Date('2026-04-20T09:00:00.000Z');
        expect(formatRssDate(date)).toBe('Mon, 20 Apr 2026 09:00:00 GMT');
    });
});
