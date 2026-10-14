import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {createRateLimiter} from './rateLimit';

// Each test builds its own limiter, so the bucket map is isolated and no
// cross-test contamination is possible.
const CFG = {windowMs: 60_000, max: 5};

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('createRateLimiter', () => {
    test('first request within window → ok=true, retryAfterSeconds=0', () => {
        const limiter = createRateLimiter(CFG);
        expect(limiter.check('k')).toEqual({ok: true, retryAfterSeconds: 0});
    });

    test('requests under max all succeed', () => {
        const limiter = createRateLimiter(CFG);
        for (let i = 0; i < 5; i++) {
            expect(limiter.check('k').ok).toBe(true);
        }
    });

    test('(max+1)th request → ok=false with retryAfterSeconds > 0', () => {
        const limiter = createRateLimiter({windowMs: 60_000, max: 3});
        for (let i = 0; i < 3; i++) limiter.check('k');
        const result = limiter.check('k');
        expect(result.ok).toBe(false);
        expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    test('window resets after windowMs elapses', () => {
        const limiter = createRateLimiter({windowMs: 1000, max: 2});
        for (let i = 0; i < 2; i++) limiter.check('k');
        expect(limiter.check('k').ok).toBe(false);

        vi.advanceTimersByTime(1001);

        expect(limiter.check('k').ok).toBe(true);
    });

    test('retryAfterSeconds is at least 1 second', () => {
        const limiter = createRateLimiter({windowMs: 100, max: 1});
        limiter.check('k');
        const result = limiter.check('k');
        expect(result.ok).toBe(false);
        expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    });

    test('separate keys have independent buckets', () => {
        const limiter = createRateLimiter({windowMs: 60_000, max: 3});
        for (let i = 0; i < 3; i++) limiter.check('a');

        expect(limiter.check('a').ok).toBe(false);
        expect(limiter.check('b').ok).toBe(true);
    });

    test('separate limiters have independent stores, so one endpoint cannot exhaust another', () => {
        const endpointA = createRateLimiter({windowMs: 60_000, max: 1});
        const endpointB = createRateLimiter({windowMs: 60_000, max: 1});

        expect(endpointA.check('shared').ok).toBe(true);
        expect(endpointA.check('shared').ok).toBe(false);

        // The same key on a different limiter is a different bucket.
        expect(endpointB.check('shared').ok).toBe(true);
    });

    test('map full of live buckets fails closed instead of evicting a live bucket', () => {
        const limiter = createRateLimiter({windowMs: 60_000, max: 1});

        for (let i = 0; i < 10_000; i++) {
            limiter.check(`full:${i}`);
        }

        const rejected = limiter.check('full:overflow');
        expect(rejected.ok).toBe(false);
        expect(rejected.retryAfterSeconds).toBeGreaterThan(0);

        // The oldest live bucket was not evicted/reset by the overflow attempt.
        expect(limiter.check('full:0').ok).toBe(false);
    });

    test('reclaims expired buckets before failing closed', () => {
        const limiter = createRateLimiter({windowMs: 1000, max: 1});
        for (let i = 0; i < 10_000; i++) {
            limiter.check(`full:${i}`);
        }

        // Once the window has passed, the store is reclaimed and new keys are allowed.
        vi.advanceTimersByTime(1001);
        expect(limiter.check('after-window').ok).toBe(true);
    });
});
