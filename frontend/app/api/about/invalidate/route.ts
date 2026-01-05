import {revalidatePath, revalidateTag} from 'next/cache';

import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {routes} from '@/src/lib/routes';
import {getClientIp} from '@/src/lib/net/getClientIp';

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
    revalidatePath(routes.about, 'page');

    return Response.json({
        ok: true,
        revalidated: ['about', 'strapi:about', routes.about],
    });
}
