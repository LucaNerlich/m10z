import {revalidatePath, revalidateTag} from 'next/cache';

import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {verifySecret} from '@/src/lib/security/verifySecret';

/**
 * Extracts the client's IP address from the request headers, preferring the X-Forwarded-For header.
 *
 * @param request - The incoming HTTP request whose headers will be inspected for client IPs.
 * @returns The client IP address from `x-forwarded-for` (first entry) or `x-real-ip`, or `'unknown'` if neither header is present.
 */
function getClientIp(request: Request): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() || 'unknown';
    return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Handle POST requests that authenticate a secret, apply per-IP rate limiting, and invalidate the "about" caches.
 *
 * @returns The HTTP Response: 200 with JSON `{ ok: true, revalidated: ['about', 'strapi:about', '/ueber-uns'] }` on success; 401 for unauthorized requests; 429 for rate-limited requests including a `Retry-After` header.
 */
export async function POST(request: Request) {
    const expected =
        process.env.LEGAL_INVALIDATION_TOKEN ?? process.env.FEED_INVALIDATION_TOKEN ?? null;
    const provided = request.headers.get('x-m10z-invalidation-secret');

    if (!verifySecret(provided, expected)) {
        return new Response('Unauthorized', {status: 401});
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`about:${ip}`, {windowMs: 60_000, max: 30});
    if (!rl.ok) {
        return new Response('Too Many Requests', {
            status: 429,
            headers: {'Retry-After': String(rl.retryAfterSeconds)},
        });
    }

    revalidateTag('about', 'max');
    revalidateTag('strapi:about', 'max');
    revalidatePath('/ueber-uns');

    return Response.json({
        ok: true,
        revalidated: ['about', 'strapi:about', '/ueber-uns'],
    });
}
