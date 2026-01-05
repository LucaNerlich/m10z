import {revalidatePath, revalidateTag} from 'next/cache';

import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {getClientIp} from '@/src/lib/net/getClientIp';

export async function POST(request: Request) {
    const expected = process.env.FEED_INVALIDATION_TOKEN ?? null;
    const provided = request.headers.get('x-m10z-invalidation-secret');

    if (!verifySecret(provided, expected)) {
        return new Response('Unauthorized', {status: 401});
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`sitemap:${ip}`, {windowMs: 60_000, max: 30});
    if (!rl.ok) {
        return new Response('Too Many Requests', {
            status: 429,
            headers: {'Retry-After': String(rl.retryAfterSeconds)},
        });
    }

    revalidateTag('sitemap:articles', 'max');
    revalidateTag('sitemap:podcasts', 'max');
    revalidateTag('sitemap:authors', 'max');
    revalidateTag('sitemap:categories', 'max');
    revalidatePath('/sitemap.xml');
    revalidatePath('/sitemap');

    return Response.json({ok: true, revalidated: ['feed:article', '/rss.xml']});
}
