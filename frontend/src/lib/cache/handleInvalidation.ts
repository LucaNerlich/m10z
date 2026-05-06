import {revalidatePath, revalidateTag} from 'next/cache';

import {getClientIp} from '@/src/lib/net/getClientIp';
import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {verifySecret} from '@/src/lib/security/verifySecret';

import {INVALIDATION_SIDE_EFFECTS} from './invalidationSideEffects';
import {INVALIDATION_TAXONOMY, isInvalidationTarget} from './invalidationTaxonomy';

const RATE_LIMIT = {windowMs: 60_000, max: 30} as const;

function expectedSecret(): string | null {
    return (
        process.env.FEED_INVALIDATION_TOKEN ??
        process.env.LEGAL_INVALIDATION_TOKEN ??
        null
    );
}

export async function handleInvalidation(
    request: Request,
    rawTarget: string,
): Promise<Response> {
    const provided = request.headers.get('x-m10z-invalidation-secret');
    if (!verifySecret(provided, expectedSecret())) {
        return new Response('Unauthorized', {status: 401});
    }

    if (!isInvalidationTarget(rawTarget)) {
        return new Response('Not Found', {status: 404});
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`${rawTarget}:${ip}`, RATE_LIMIT);
    if (!rl.ok) {
        return new Response('Too Many Requests', {
            status: 429,
            headers: {'Retry-After': String(rl.retryAfterSeconds)},
        });
    }

    const {tags, pages, paths} = INVALIDATION_TAXONOMY[rawTarget];
    for (const tag of tags) {
        revalidateTag(tag, 'max');
    }
    for (const page of pages) {
        revalidatePath(page, 'page');
    }
    for (const path of paths) {
        revalidatePath(path);
    }

    await INVALIDATION_SIDE_EFFECTS[rawTarget]?.();

    return Response.json({
        ok: true,
        revalidated: [...tags, ...pages, ...paths],
    });
}
