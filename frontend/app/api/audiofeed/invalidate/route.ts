import {revalidatePath, revalidateTag} from 'next/cache';

import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {routes} from '@/src/lib/routes';

function getClientIp(request: Request): string {
    // Best-effort; behind a proxy you may want to rely on platform-provided headers.
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() || 'unknown';
    return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: Request) {
    const expected = process.env.FEED_INVALIDATION_TOKEN ?? null;
    const provided = request.headers.get('x-m10z-invalidation-secret');

    if (!verifySecret(provided, expected)) {
        // Fail securely; no hints.
        return new Response('Unauthorized', {status: 401});
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`audiofeed:${ip}`, {windowMs: 60_000, max: 30});
    if (!rl.ok) {
        return new Response('Too Many Requests', {
            status: 429,
            headers: {'Retry-After': String(rl.retryAfterSeconds)},
        });
    }

    revalidateTag('feed:audio', 'max');
    revalidateTag('strapi:podcast', 'max');
    revalidateTag('strapi:podcast:list', 'max');
    // Categories show podcast counts, so invalidate category pages too
    revalidateTag('strapi:category', 'max');
    revalidateTag('strapi:category:list', 'max');
    // Invalidate homepage cache tag (homepage uses HOME_ARTICLE_TAGS which includes 'page:home'). This dual-tagging approach allows granular invalidation.
    revalidateTag('page:home', 'max');
    revalidatePath('/audiofeed.xml');
    revalidatePath(routes.home, 'page');
    revalidatePath(routes.podcasts, 'page');
    revalidatePath(routes.podcasts + '/[slug]', 'page');
    revalidatePath(routes.categories, 'page');
    revalidatePath(routes.categories + '/[slug]', 'page');

    return Response.json({
        ok: true,
        revalidated: [
            'feed:audio',
            'strapi:podcast',
            'strapi:podcast:list',
            'strapi:category',
            'strapi:category:list',
            '/audiofeed.xml',
            '/',
            '/podcasts',
            '/podcasts/[slug]',
            '/kategorien',
            '/kategorien/[slug]',
        ],
    });
}
