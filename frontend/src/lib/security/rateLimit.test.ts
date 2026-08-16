import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {checkRateLimit} from './rateLimit';

// The rateLimit module owns a process-level `buckets` Map. Each test uses a
// unique key derived from the test name to avoid cross-test contamination.
function key(name: string): string {
    return `test:${name}:${Math.random().toString(36).slice(2, 10)}`;
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('checkRateLimit', () => {
    test('first request within window → ok=true, retryAfterSeconds=0', () => {
        const k = key('first');
        const result = checkRateLimit(k, {windowMs: 60_000, max: 5});
        expect(result).toEqual({ok: true, retryAfterSeconds: 0});
    });

    test('requests under max all succeed', () => {
        const k = key('under-max');
        for (let i = 0; i < 5; i++) {
            expect(checkRateLimit(k, {windowMs: 60_000, max: 5}).ok).toBe(true);
        }
    });

    test('(max+1)th request → ok=false with retryAfterSeconds > 0', () => {
        const k = key('over-max');
        for (let i = 0; i < 3; i++) {
            checkRateLimit(k, {windowMs: 60_000, max: 3});
        }
        const result = checkRateLimit(k, {windowMs: 60_000, max: 3});
        expect(result.ok).toBe(false);
        expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    test('window resets after windowMs elapses', () => {
        const k = key('window-reset');
        // Fill the bucket.
        for (let i = 0; i < 2; i++) {
            checkRateLimit(k, {windowMs: 1000, max: 2});
        }
        expect(checkRateLimit(k, {windowMs: 1000, max: 2}).ok).toBe(false);

        // Advance past the window.
        vi.advanceTimersByTime(1001);

        expect(checkRateLimit(k, {windowMs: 1000, max: 2}).ok).toBe(true);
    });

    test('retryAfterSeconds is at least 1 second', () => {
        const k = key('min-retry');
        checkRateLimit(k, {windowMs: 100, max: 1});
        const result = checkRateLimit(k, {windowMs: 100, max: 1});
        expect(result.ok).toBe(false);
        expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    });

    test('separate keys have independent buckets', () => {
        const a = key('iso-a');
        const b = key('iso-b');
        for (let i = 0; i < 3; i++) checkRateLimit(a, {windowMs: 60_000, max: 3});

        expect(checkRateLimit(a, {windowMs: 60_000, max: 3}).ok).toBe(false);
        expect(checkRateLimit(b, {windowMs: 60_000, max: 3}).ok).toBe(true);
    });

    test('map full of live buckets fails closed instead of evicting a live bucket', async () => {
        // Use a fresh module instance so the 10k filler buckets cannot leak into
        // other tests (the production Map is module-global and shared).
        vi.resetModules();
        const fresh = await import('./rateLimit');

        for (let i = 0; i < 10_000; i++) {
            fresh.checkRateLimit(`full:${i}`, {windowMs: 60_000, max: 1});
        }

        const rejected = fresh.checkRateLimit('full:overflow', {windowMs: 60_000, max: 1});
        expect(rejected.ok).toBe(false);
        expect(rejected.retryAfterSeconds).toBeGreaterThan(0);

        // The oldest live bucket was not evicted/reset by the overflow attempt.
        expect(fresh.checkRateLimit('full:0', {windowMs: 60_000, max: 1}).ok).toBe(false);
    });
});
