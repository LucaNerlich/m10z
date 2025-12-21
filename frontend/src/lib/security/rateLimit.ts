type Bucket = {count: number; resetAtMs: number};

const buckets = new Map<string, Bucket>();

export type RateLimitConfig = {
    windowMs: number;
    max: number;
};

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


