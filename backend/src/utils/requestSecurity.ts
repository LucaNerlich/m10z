/**
 * Request-security helpers for authenticated diagnostic endpoints.
 *
 * Extracted from the search-index controller so the constant-time secret
 * comparison, client-IP extraction, and in-memory rate limiter can be
 * unit-tested without booting Strapi.
 */

import crypto from 'crypto';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
/** Sweep expired entries once the map grows past this size, so rotating keys cannot leak memory. */
export const RATE_LIMIT_MAX_ENTRIES = 10_000;
export const rateLimitState = new Map<string, {count: number; resetAt: number}>();

/**
 * Trim a candidate secret and return it only when it is a non-empty string.
 */
export function normalizeSecret(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

/**
 * Compare a provided secret against the expected one in constant time.
 *
 * Returns `false` for missing/empty values or length mismatches before the
 * timing-safe comparison.
 */
export function verifySecret(provided: unknown, expected: unknown): boolean {
    const expectedValue = normalizeSecret(expected);
    const providedValue = normalizeSecret(provided);
    if (!expectedValue || !providedValue) return false;
    const expectedBuffer = Buffer.from(expectedValue);
    const providedBuffer = Buffer.from(providedValue);
    if (expectedBuffer.length !== providedBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Minimal structural contract for a Koa-like request context (the parts
 * `getClientIp` relies on), so the helper stays decoupled from Koa's types.
 */
type KoaLikeContext = {
    ip?: string;
    request?: {
        ip?: string;
        headers?: Record<string, string | string[] | undefined>;
    };
};

/**
 * Extract the client IP from a Koa-like context.
 *
 * Prefers the Koa-computed `request.ip` (the socket peer, or the client address
 * from `x-forwarded-for` only when `server.proxy` explicitly marks the reverse
 * proxy as trusted). The raw `x-forwarded-for` header is client-spoofable, so it
 * is only used as a last-resort fallback when no socket IP is available.
 */
export function getClientIp(ctx: KoaLikeContext | null | undefined): string {
    const socketIp = ctx?.request?.ip ?? ctx?.ip;
    if (typeof socketIp === 'string' && socketIp.length > 0 && socketIp !== 'unknown') {
        return socketIp;
    }
    const forwarded = ctx?.request?.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return typeof socketIp === 'string' && socketIp.length > 0 ? socketIp : 'unknown';
}

/**
 * Fixed-window in-memory rate limiter (30 requests / 60s per key).
 *
 * @returns `{ok: true}` when the request is allowed, otherwise `{ok: false}`
 * with the number of seconds until the window resets.
 */
export function checkRateLimit(key: string): {ok: boolean; retryAfterSeconds: number} {
    const now = Date.now();
    const existing = rateLimitState.get(key);
    if (existing && now <= existing.resetAt) {
        if (existing.count >= RATE_LIMIT_MAX) {
            const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
            return {ok: false, retryAfterSeconds};
        }
        existing.count += 1;
        return {ok: true, retryAfterSeconds: 0};
    }

    // New or expired key. Prune expired entries when the map has grown large so
    // distinct keys (attacker-rotated or just long-lived traffic) cannot grow it
    // without bound.
    if (rateLimitState.size >= RATE_LIMIT_MAX_ENTRIES) {
        for (const [storedKey, stored] of rateLimitState) {
            if (now > stored.resetAt) {
                rateLimitState.delete(storedKey);
            }
        }
    }

    rateLimitState.set(key, {count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS});
    return {ok: true, retryAfterSeconds: 0};
}
