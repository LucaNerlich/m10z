import {revalidatePath, revalidateTag} from 'next/cache';

import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {routes} from '@/src/lib/routes';
import {getClientIp} from '@/src/lib/net/getClientIp';

export async function POST(request: Request) {
    const expected = process.env.FEED_INVALIDATION_TOKEN ?? null;
    const provided = request.headers.get('x-m10z-invalidation-secret');

    if (!verifySecret(provided, expected)) {
        return new Response('Unauthorized', {status: 401});
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`author:${ip}`, {windowMs: 60_000, max: 30});
    if (!rl.ok) {
        return new Response('Too Many Requests', {
            status: 429,
            headers: {'Retry-After': String(rl.retryAfterSeconds)},
        });
    }

    // Invalidate author-related cache tags
    revalidateTag('strapi:author', 'max');
    revalidateTag('strapi:author:list', 'max');

    // Authors appear on article and podcast list pages, so invalidate those too
    revalidateTag('strapi:article', 'max');
    revalidateTag('strapi:article:list', 'max');
    revalidateTag('strapi:podcast', 'max');
    revalidateTag('strapi:podcast:list', 'max');

    // Invalidate pages that display authors
    revalidatePath(routes.articles, 'page');
    revalidatePath(routes.articles + '/[slug]', 'page');
    revalidatePath(routes.podcasts, 'page');
    revalidatePath(routes.podcasts + '/[slug]', 'page');
    revalidatePath(routes.authors + '/[slug]', 'page');
    revalidatePath(routes.home, 'page');

    return Response.json({
        ok: true,
        revalidated: [
            'strapi:author',
            'strapi:author:list',
            'strapi:article',
            'strapi:article:list',
            'strapi:podcast',
            'strapi:podcast:list',
            '/artikel',
            '/artikel/[slug]',
            '/podcasts',
            '/podcasts/[slug]',
            '/team/[slug]',
            '/',
        ],
    });
}

