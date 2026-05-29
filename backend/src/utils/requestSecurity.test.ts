import {afterEach, describe, expect, test, vi} from 'vitest';

import {checkRateLimit, getClientIp, normalizeSecret, verifySecret} from './requestSecurity';

describe('normalizeSecret', () => {
    test('returns null for non-strings and empty/whitespace values', () => {
        expect(normalizeSecret(null)).toBeNull();
        expect(normalizeSecret(123)).toBeNull();
        expect(normalizeSecret('   ')).toBeNull();
    });

    test('trims and returns non-empty strings', () => {
        expect(normalizeSecret('  token  ')).toBe('token');
    });
});

describe('verifySecret', () => {
    test('returns true only for matching non-empty secrets', () => {
        expect(verifySecret('s3cret', 's3cret')).toBe(true);
    });

    test('returns false on mismatch, length difference, or missing values', () => {
        expect(verifySecret('s3cret', 'other!')).toBe(false);
        expect(verifySecret('short', 'longer-secret')).toBe(false);
        expect(verifySecret(undefined, 's3cret')).toBe(false);
        expect(verifySecret('s3cret', '')).toBe(false);
    });
});

describe('getClientIp', () => {
    test('uses the first hop of x-forwarded-for', () => {
        expect(getClientIp({request: {headers: {'x-forwarded-for': '203.0.113.7, 10.0.0.1'}}})).toBe('203.0.113.7');
    });

    test('falls back to request.ip then ctx.ip then "unknown"', () => {
        expect(getClientIp({request: {ip: '9.9.9.9'}})).toBe('9.9.9.9');
        expect(getClientIp({ip: '8.8.8.8'})).toBe('8.8.8.8');
        expect(getClientIp({})).toBe('unknown');
    });
});

describe('checkRateLimit', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    test('allows requests up to the limit then blocks further ones', () => {
        const key = 'unit-allow';
        for (let i = 0; i < 30; i++) {
            expect(checkRateLimit(key).ok).toBe(true);
        }
        const blocked = checkRateLimit(key);
        expect(blocked.ok).toBe(false);
        expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    });

    test('resets after the window elapses', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const key = 'unit-reset';
        for (let i = 0; i < 30; i++) checkRateLimit(key);
        expect(checkRateLimit(key).ok).toBe(false);

        vi.setSystemTime(61_000);
        expect(checkRateLimit(key).ok).toBe(true);
    });
});
