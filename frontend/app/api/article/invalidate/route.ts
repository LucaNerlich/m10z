import {revalidatePath, revalidateTag} from 'next/cache';

import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {verifySecret} from '@/src/lib/security/verifySecret';

/**
 * Extracts the client's IP address from the request headers.
 *
 * Prefers the first entry of the `x-forwarded-for` header (comma-separated), falls back to `x-real-ip`, and returns `'unknown'` if neither header is present.
 *
 * @param request - The incoming Request whose headers will be read
 * @returns The resolved client IP address or `'unknown'` when not available
 */
function getClientIp(request: Request): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() || 'unknown';
    return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Handle POST requests to invalidate article-related cache tags and paths.
 *
 * @param request - Incoming request; must include the header `x-m10z-invalidation-secret` that matches the `FEED_INVALIDATION_TOKEN` environment variable.
 * @returns A Response. On success the body is JSON `{ ok: true, revalidated: string[] }` listing invalidated tags and paths. Returns a 401 Response when authentication fails or a 429 Response with a `Retry-After` header when the per-IP rate limit is exceeded.
 */
export async function POST(request: Request) {
    const expected = process.env.FEED_INVALIDATION_TOKEN ?? null;
    const provided = request.headers.get('x-m10z-invalidation-secret');

    if (!verifySecret(provided, expected)) {
        return new Response('Unauthorized', {status: 401});
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`article:${ip}`, {windowMs: 60_000, max: 30});
    if (!rl.ok) {
        return new Response('Too Many Requests', {
            status: 429,
            headers: {'Retry-After': String(rl.retryAfterSeconds)},
        });
    }

    // Invalidate article-related cache tags
    revalidateTag('strapi:article', 'max');
    revalidateTag('strapi:article:list', 'max');
    
    // Invalidate pages that display articles
    revalidatePath('/artikel', 'page');
    revalidatePath('/artikel/[slug]', 'page');
    revalidatePath('/', 'page');

    return Response.json({
        ok: true,
        revalidated: [
            'strapi:article',
            'strapi:article:list',
            '/artikel',
            '/artikel/[slug]',
            '/',
        ],
    });
}
