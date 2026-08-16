import {afterEach, describe, expect, test, vi} from 'vitest';

import {
    checkRateLimit,
    getClientIp,
    normalizeSecret,
    RATE_LIMIT_MAX_ENTRIES,
    rateLimitState,
    verifySecret,
} from './requestSecurity';

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
    test('prefers the Koa-computed request.ip over the spoofable x-forwarded-for header', () => {
        expect(
            getClientIp({request: {ip: '9.9.9.9', headers: {'x-forwarded-for': '203.0.113.7, 10.0.0.1'}}}),
        ).toBe('9.9.9.9');
    });

    test('falls back to x-forwarded-for only when no socket IP is available', () => {
        expect(getClientIp({request: {headers: {'x-forwarded-for': '203.0.113.7, 10.0.0.1'}}})).toBe('203.0.113.7');
    });

    test('falls back to ctx.ip then "unknown"', () => {
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

    test('evicts expired entries once the map exceeds the sweep threshold', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        for (let i = 0; i < RATE_LIMIT_MAX_ENTRIES; i++) {
            rateLimitState.set(`seed-${i}`, {count: 1, resetAt: 0});
        }
        checkRateLimit('sweep-fresh');

        vi.setSystemTime(61_000);
        checkRateLimit('sweep-fresh-again');

        expect(rateLimitState.size).toBeLessThan(RATE_LIMIT_MAX_ENTRIES);
        expect(rateLimitState.has('seed-0')).toBe(false);
        expect(rateLimitState.get('sweep-fresh-again')).toBeDefined();
    });
});
