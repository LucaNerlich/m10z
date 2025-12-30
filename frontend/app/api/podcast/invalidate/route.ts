import {revalidatePath, revalidateTag} from 'next/cache';

import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {routes} from '@/src/lib/routes';

/**
 * Determine the client's IP address from request headers.
 *
 * @param request - The incoming request whose headers are inspected
 * @returns The first IP from `x-forwarded-for` if present, otherwise the `x-real-ip` value, or the string `'unknown'` if neither header provides an IP
 */
function getClientIp(request: Request): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() || 'unknown';
    return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Handle POST requests to invalidate podcast-related cache tags and pages.
 *
 * Verifies the secret provided in the `x-m10z-invalidation-secret` header against
 * the `FEED_INVALIDATION_TOKEN` environment value and enforces a per-IP rate limit.
 * On success, invalidates podcast cache tags and related page paths, then responds
 * with a JSON payload listing the invalidated keys. Responds with 401 when the
 * secret is invalid and 429 when the rate limit is exceeded.
 *
 * @param request - Incoming Request; must include the `x-m10z-invalidation-secret` header when calling this endpoint
 * @returns An object `{ ok: true, revalidated: string[] }` listing the cache tags and paths that were revalidated
 */
export async function POST(request: Request) {
    const expected = process.env.FEED_INVALIDATION_TOKEN ?? null;
    const provided = request.headers.get('x-m10z-invalidation-secret');

    if (!verifySecret(provided, expected)) {
        return new Response('Unauthorized', {status: 401});
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`podcast:${ip}`, {windowMs: 60_000, max: 30});
    if (!rl.ok) {
        return new Response('Too Many Requests', {
            status: 429,
            headers: {'Retry-After': String(rl.retryAfterSeconds)},
        });
    }

    // Invalidate podcast-related cache tags
    revalidateTag('strapi:podcast', 'max');
    revalidateTag('strapi:podcast:list', 'max');
    // Invalidate homepage cache tag (homepage uses HOME_PODCAST_TAGS which includes 'page:home')
    // This dual-tagging approach allows granular invalidation: content-specific tags (strapi:podcast)
    // enable targeted cache control, while page:home allows homepage-specific invalidation without
    // invalidating all podcast detail pages. This separation enables future optimizations.
    revalidateTag('page:home', 'max');

    // Invalidate pages that display podcasts
    revalidatePath(routes.podcasts, 'page');
    revalidatePath(routes.podcasts + '/[slug]', 'page');
    revalidatePath(routes.home, 'page');

    return Response.json({
        ok: true,
        revalidated: [
            'strapi:podcast',
            'strapi:podcast:list',
            routes.podcasts,
            routes.podcasts + '/[slug]',
            '/',
        ],
    });
}
