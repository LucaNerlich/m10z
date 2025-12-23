type Bucket = {count: number; resetAtMs: number};

const buckets = new Map<string, Bucket>();

export type RateLimitConfig = {
    windowMs: number;
    max: number;
};

/**
 * Checks if a given key is within the allowed rate limit, based on the provided configuration.
 *
 * @param {string} key - The unique identifier used to track rate-limiting for a specific entity.
 * @param {RateLimitConfig} cfg - The configuration object containing rate-limiting rules, including the max allowed requests and the time window.
 * @return {{ok: boolean, retryAfterSeconds: number}} An object indicating whether the key is within the rate limit (`ok`),
 * and the number of seconds to wait before retrying if the limit has been exceeded (`retryAfterSeconds`).
 */
export function checkRateLimit(key: string, cfg: RateLimitConfig): {ok: boolean; retryAfterSeconds: number} {
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAtMs <= now) {
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


