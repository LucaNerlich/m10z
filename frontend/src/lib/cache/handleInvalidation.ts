import {revalidatePath, revalidateTag} from 'next/cache';

import {getClientIp} from '@/src/lib/net/getClientIp';
import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {feedRegistry} from '@/src/lib/rss/feedRegistry';
import {isContentTypeKey, isDocumentAction, type InvalidationEvent} from '@/src/lib/shared/strapiContract';

import {computeRevalidation} from './computeRevalidation';

const RATE_LIMIT = {windowMs: 60_000, max: 30} as const;

function expectedSecret(): string | null {
    // STRAPI_INVALIDATION_SECRET is the current name; the other two are read for
    // backward compatibility during rollout and should be retired once confirmed.
    return (
        process.env.STRAPI_INVALIDATION_SECRET ??
        process.env.FEED_INVALIDATION_TOKEN ??
        process.env.LEGAL_INVALIDATION_TOKEN ??
        null
    );
}

function parseEvent(body: unknown): InvalidationEvent | null {
    if (typeof body !== 'object' || body === null) return null;
    const {type, action, slug, relations} = body as Record<string, unknown>;
    if (typeof type !== 'string' || !isContentTypeKey(type)) return null;
    if (typeof action !== 'string' || !isDocumentAction(action)) return null;
    if (slug !== undefined && typeof slug !== 'string') return null;
    if (relations !== undefined && (typeof relations !== 'object' || relations === null)) return null;
    return {type, action, ...(slug ? {slug} : {}), ...(relations ? {relations: relations as InvalidationEvent['relations']} : {})};
}

export async function handleInvalidation(request: Request): Promise<Response> {
    const provided = request.headers.get('x-m10z-invalidation-secret');
    if (!verifySecret(provided, expectedSecret())) {
        return new Response('Unauthorized', {status: 401});
    }

    let event: InvalidationEvent | null;
    try {
        event = parseEvent(await request.json());
    } catch {
        event = null;
    }
    if (!event) {
        return new Response('Bad Request', {status: 400});
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`${event.type}:${ip}`, RATE_LIMIT);
    if (!rl.ok) {
        return new Response('Too Many Requests', {
            status: 429,
            headers: {'Retry-After': String(rl.retryAfterSeconds)},
        });
    }

    const {tags, pages, paths} = computeRevalidation(event);
    for (const tag of tags) {
        revalidateTag(tag, 'max');
    }
    for (const page of pages) {
        revalidatePath(page, 'page');
    }
    for (const path of paths) {
        revalidatePath(path);
    }

    feedRegistry.onInvalidate(event.type);

    return Response.json({
        ok: true,
        revalidated: [...tags, ...pages, ...paths],
    });
}
