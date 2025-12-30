import {revalidatePath, revalidateTag} from 'next/cache';

import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {routes} from '@/src/lib/routes';

function getClientIp(request: Request): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() || 'unknown';
    return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: Request) {
    const expected = process.env.FEED_INVALIDATION_TOKEN ?? null;
    const provided = request.headers.get('x-m10z-invalidation-secret');

    if (!verifySecret(provided, expected)) {
        return new Response('Unauthorized', {status: 401});
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`articlefeed:${ip}`, {windowMs: 60_000, max: 30});
    if (!rl.ok) {
        return new Response('Too Many Requests', {
            status: 429,
            headers: {'Retry-After': String(rl.retryAfterSeconds)},
        });
    }

    revalidateTag('feed:article', 'max');
    revalidateTag('strapi:article', 'max');
    revalidateTag('strapi:article:list', 'max');
    // Categories show article counts, so invalidate category pages too
    revalidateTag('strapi:category', 'max');
    revalidateTag('strapi:category:list', 'max');
    revalidatePath('/rss.xml');
    revalidatePath(routes.home, 'page');
    revalidatePath(routes.articles, 'page');
    revalidatePath(routes.articles + '/[slug]', 'page');
    revalidatePath(routes.categories, 'page');
    revalidatePath(routes.categories + '/[slug]', 'page');

    return Response.json({
        ok: true,
        revalidated: [
            'feed:article',
            'strapi:article',
            'strapi:article:list',
            'strapi:category',
            'strapi:category:list',
            '/rss.xml',
            '/',
            '/artikel',
            '/artikel/[slug]',
            '/kategorien',
            '/kategorien/[slug]',
        ],
    });
}
