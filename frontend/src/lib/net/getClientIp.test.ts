import {describe, expect, test} from 'vitest';

import {getClientIp} from './getClientIp';

function requestWith(headers: Record<string, string>): Request {
    return new Request('https://m10z.de/api/x', {headers});
}

describe('getClientIp', () => {
    test('uses the last entry of x-forwarded-for (proxy-appended hop)', () => {
        expect(getClientIp(requestWith({'x-forwarded-for': '203.0.113.7, 10.0.0.1'}))).toBe('10.0.0.1');
    });

    test('uses the only entry when x-forwarded-for has a single hop', () => {
        expect(getClientIp(requestWith({'x-forwarded-for': '198.51.100.2'}))).toBe('198.51.100.2');
    });

    test('trims whitespace around the forwarded IP', () => {
        expect(getClientIp(requestWith({'x-forwarded-for': '198.51.100.2,   10.0.0.1  '}))).toBe('10.0.0.1');
    });

    test('accepts IPv6 addresses including IPv4-mapped forms', () => {
        expect(getClientIp(requestWith({'x-forwarded-for': 'spoofed, ::ffff:192.0.2.1'}))).toBe('::ffff:192.0.2.1');
    });

    test('rejects garbage entries and falls back to the next usable value', () => {
        expect(getClientIp(requestWith({'x-forwarded-for': 'spoofed, <script>, 10.0.0.1'}))).toBe('10.0.0.1');
    });

    test('falls back to x-real-ip when x-forwarded-for is absent', () => {
        expect(getClientIp(requestWith({'x-real-ip': '192.0.2.5'}))).toBe('192.0.2.5');
    });

    test('falls back to x-real-ip when x-forwarded-for contains no usable value', () => {
        expect(getClientIp(requestWith({'x-forwarded-for': 'garbage', 'x-real-ip': '192.0.2.5'}))).toBe('192.0.2.5');
    });

    test('returns "unknown" when no usable header is present', () => {
        expect(getClientIp(requestWith({}))).toBe('unknown');
    });

    test('returns "unknown" when x-forwarded-for is empty after trimming', () => {
        expect(getClientIp(requestWith({'x-forwarded-for': '   '}))).toBe('unknown');
    });
});
