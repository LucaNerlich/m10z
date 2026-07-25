import {NextResponse} from 'next/server';

import {getClientIp} from '@/src/lib/net/getClientIp';
import {checkRateLimit} from '@/src/lib/security/rateLimit';

const STRAPI_URL = process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:1337';

export async function DELETE(request: Request) {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`push-unsubscribe:${ip}`, {windowMs: 60_000, max: 10});
    if (!rl.ok) {
        return NextResponse.json({error: 'Too many requests'}, {status: 429});
    }

    const body = await request.json().catch(() => null);
    if (!body?.endpoint) {
        return NextResponse.json({error: 'Missing endpoint'}, {status: 400});
    }

    const pushSecret = process.env.PUSH_NOTIFICATION_SECRET;
    if (!pushSecret) {
        return NextResponse.json({error: 'Push not configured'}, {status: 500});
    }

    try {
        const strapiResponse = await fetch(`${STRAPI_URL}/api/push-subscriptions`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'x-m10z-push-secret': pushSecret,
            },
            body: JSON.stringify(body),
        });

        return new NextResponse(null, {status: strapiResponse.status});
    } catch {
        return NextResponse.json({error: 'Failed to unregister subscription'}, {status: 502});
    }
}
