import {NextResponse} from 'next/server';

import {getClientIp} from '@/src/lib/net/getClientIp';
import {createRateLimiter, type RateLimiter} from '@/src/lib/security/rateLimit';
import {verifySecret} from '@/src/lib/security/verifySecret';

export type DiagnosticsAuthOptions = {
    /** Rate-limit key prefix; each diagnostics endpoint gets its own bucket store. */
    bucket: string;
    /** Requests allowed per minute for that bucket. */
    max: number;
};

// One limiter — and so one bucket store — per endpoint, matching the
// per-endpoint isolation `rateLimit.ts` provides: saturating one endpoint's
// store cannot fail another closed.
const limiters = new Map<string, RateLimiter>();

function limiterFor(bucket: string, max: number): RateLimiter {
    let limiter = limiters.get(bucket);
    if (!limiter) {
        limiter = createRateLimiter({windowMs: 60_000, max});
        limiters.set(bucket, limiter);
    }
    return limiter;
}

/**
 * Rate-limit and authenticate a diagnostics request.
 *
 * Rate limiting runs before authentication so secret-guessing is throttled too.
 * The token is header-only: a query-string token would leak into proxy/request
 * logs, browser history and Referer headers.
 *
 * @returns `null` when the request may proceed, otherwise the response to send
 * (`429` with `Retry-After`, or `401`).
 */
export function requireDiagnosticsAuth(
    request: Request,
    {bucket, max}: DiagnosticsAuthOptions,
): NextResponse | null {
    const ip = getClientIp(request);
    const rl = limiterFor(bucket, max).check(`${bucket}:${ip}`);
    if (!rl.ok) {
        return new NextResponse('Too Many Requests', {
            status: 429,
            headers: {'Retry-After': String(rl.retryAfterSeconds)},
        });
    }

    const expected = process.env.DIAGNOSTICS_TOKEN ?? null;
    const provided = request.headers.get('x-m10z-diagnostics-token');
    if (!verifySecret(provided, expected)) {
        return new NextResponse('Unauthorized', {status: 401});
    }

    return null;
}
