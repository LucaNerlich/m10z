import {NextResponse} from 'next/server';

import {getClientIp} from '@/src/lib/net/getClientIp';
import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {verifySecret} from '@/src/lib/security/verifySecret';

import {getRecentDiagnosticEvents} from './runtimeDiagnostics';
import {getAudioFeedRuntimeState} from '../rss/audioFeedRouteHandler';
import {getSchedulerState as getArticleFeedSchedulerState} from '../rss/articleFeedRouteHandler';

export async function handleDiagnosticsGet(request: Request): Promise<NextResponse> {
    const expected = process.env.DIAGNOSTICS_TOKEN ?? null;
    const {searchParams} = new URL(request.url);
    const provided = searchParams.get('token') ?? request.headers.get('x-m10z-diagnostics-token');

    if (!verifySecret(provided, expected)) {
        return new NextResponse('Unauthorized', {status: 401});
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`diag:${ip}`, {windowMs: 60_000, max: 30});
    if (!rl.ok) {
        return new NextResponse('Too Many Requests', {
            status: 429,
            headers: {'Retry-After': String(rl.retryAfterSeconds)},
        });
    }

    return NextResponse.json({
        now: Date.now(),
        events: getRecentDiagnosticEvents(),
        memory: process.memoryUsage(),
        schedulers: {
            audioFeed: getAudioFeedRuntimeState(),
            articleFeed: getArticleFeedSchedulerState(),
        },
    });
}
