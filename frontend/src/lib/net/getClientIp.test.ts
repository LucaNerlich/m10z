import {describe, expect, test} from 'vitest';

import {getClientIp} from './getClientIp';

function requestWith(headers: Record<string, string>): Request {
    return new Request('https://m10z.de/api/x', {headers});
}

describe('getClientIp', () => {
    test('uses the first entry of x-forwarded-for', () => {
        expect(getClientIp(requestWith({'x-forwarded-for': '203.0.113.7, 10.0.0.1'}))).toBe('203.0.113.7');
    });

    test('trims whitespace around the forwarded IP', () => {
        expect(getClientIp(requestWith({'x-forwarded-for': '  198.51.100.2  '}))).toBe('198.51.100.2');
    });

    test('falls back to x-real-ip when x-forwarded-for is absent', () => {
        expect(getClientIp(requestWith({'x-real-ip': '192.0.2.5'}))).toBe('192.0.2.5');
    });

    test('returns "unknown" when no usable header is present', () => {
        expect(getClientIp(requestWith({}))).toBe('unknown');
    });

    test('returns "unknown" when x-forwarded-for is empty after trimming', () => {
        expect(getClientIp(requestWith({'x-forwarded-for': '   '}))).toBe('unknown');
    });
});
