type Bucket = {count: number; resetAtMs: number};

const MAX_BUCKETS = 10_000;

export type RateLimitConfig = {
    windowMs: number;
    max: number;
};

export type RateLimitResult = {ok: boolean; retryAfterSeconds: number};

export type RateLimiter = {
    check(key: string): RateLimitResult;
};

/**
 * Create an isolated fixed-window rate limiter.
 *
 * Every limiter owns its own bucket map. Sharing one process-global map across
 * endpoints (the previous design) meant that saturating it — trivial when a
 * pre-auth, key-spooofable endpoint is involved — failed closed for *every*
 * other endpoint until the buckets expired. Scoping the store per limiter keeps
 * the fail-closed guarantee local to the limiter that is actually under load.
 *
 * @param cfg - The `windowMs` window and `max` requests allowed per key.
 * @return A limiter whose `check(key)` returns `{ok: true}` when the key is
 * within its limit, otherwise `{ok: false}` with the seconds until reset.
 */
export function createRateLimiter(cfg: RateLimitConfig): RateLimiter {
    const buckets = new Map<string, Bucket>();

    function pruneExpired(now: number): void {
        for (const [key, bucket] of buckets) {
            if (bucket.resetAtMs <= now) {
                buckets.delete(key);
            }
        }
    }

    function check(key: string): RateLimitResult {
        const now = Date.now();
        const existing = buckets.get(key);

        if (!existing || existing.resetAtMs <= now) {
            if (buckets.size >= MAX_BUCKETS) {
                pruneExpired(now);
            }
            if (buckets.size >= MAX_BUCKETS) {
                // Still full of live buckets. Fail closed instead of evicting a
                // live one: evicting would silently reset that key's limit,
                // letting an attacker churn keys to clear arbitrary buckets or
                // their own limit on demand.
                const oldestKey = buckets.keys().next().value;
                const oldest = oldestKey !== undefined ? buckets.get(oldestKey) : undefined;
                const retryAfterSeconds = oldest
                    ? Math.max(1, Math.ceil((oldest.resetAtMs - now) / 1000))
                    : 1;
                return {ok: false, retryAfterSeconds};
            }
            buckets.set(key, {count: 1, resetAtMs: now + cfg.windowMs});
            return {ok: true, retryAfterSeconds: 0};
        }

        if (existing.count >= cfg.max) {
            const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAtMs - now) / 1000));
            return {ok: false, retryAfterSeconds};
        }

        existing.count += 1;
        return {ok: true, retryAfterSeconds: 0};
    }

    return {check};
}
