import {NextResponse} from 'next/server';

import {getClientIp} from '@/src/lib/net/getClientIp';
import {createRateLimiter} from '@/src/lib/security/rateLimit';
import {verifySecret} from '@/src/lib/security/verifySecret';

import {getRecentDiagnosticEvents} from './runtimeDiagnostics';
import {getAudioFeedRuntimeState} from '../rss/audioFeedRouteHandler';
import {getSchedulerState as getArticleFeedSchedulerState} from '../rss/articleFeedRouteHandler';

// Own bucket store, so another endpoint's limiter filling up cannot fail this one closed.
const diagnosticsLimiter = createRateLimiter({windowMs: 60_000, max: 30});

export async function handleDiagnosticsGet(request: Request): Promise<NextResponse> {
    // Rate-limit before authentication so secret-guessing attempts are
    // throttled too. The token is header-only: query-string tokens would leak
    // into proxy/request logs, browser history, and Referer headers.
    const ip = getClientIp(request);
    const rl = diagnosticsLimiter.check(`diag:${ip}`);
    if (!rl.ok) {
        return new NextResponse('Too Many Requests', {
            status: 429,
            headers: {'Retry-After': String(rl.retryAfterSeconds)},
        });
    }

    const expected = process.env.DIAGNOSTICS_TOKEN ?? null;
    const provided = request.headers.get('x-m10z-diagnostics-token');

    if (!verifySecret(provided, expected)) {
        return new NextResponse('Unauthorized', {status: 401});
    }

    return NextResponse.json(
        {
            now: Date.now(),
            events: getRecentDiagnosticEvents(),
            memory: process.memoryUsage(),
            schedulers: {
                audioFeed: getAudioFeedRuntimeState(),
                articleFeed: getArticleFeedSchedulerState(),
            },
        },
        {headers: {'Cache-Control': 'no-store'}},
    );
}
