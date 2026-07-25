import {NextResponse} from 'next/server';

import {getClientIp} from '@/src/lib/net/getClientIp';
import {checkRateLimit} from '@/src/lib/security/rateLimit';

const STRAPI_URL = process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:1337';

export async function POST(request: Request) {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`push-subscribe:${ip}`, {windowMs: 60_000, max: 10});
    if (!rl.ok) {
        return NextResponse.json({error: 'Too many requests'}, {status: 429});
    }

    const body = await request.json().catch(() => null);
    if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
        return NextResponse.json({error: 'Invalid subscription object'}, {status: 400});
    }

    const pushSecret = process.env.PUSH_NOTIFICATION_SECRET;
    if (!pushSecret) {
        return NextResponse.json({error: 'Push not configured'}, {status: 500});
    }

    try {
        const strapiResponse = await fetch(`${STRAPI_URL}/api/push-subscriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-m10z-push-secret': pushSecret,
            },
            body: JSON.stringify(body),
        });

        const data = await strapiResponse.json().catch(() => null);
        return NextResponse.json(data ?? {}, {status: strapiResponse.status});
    } catch {
        return NextResponse.json({error: 'Failed to register subscription'}, {status: 502});
    }
}
