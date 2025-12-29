import {revalidatePath, revalidateTag} from 'next/cache';

import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {verifySecret} from '@/src/lib/security/verifySecret';

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

