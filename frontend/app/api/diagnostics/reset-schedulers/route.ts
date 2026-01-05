import {NextResponse} from 'next/server';

import {stopScheduler as stopAudioScheduler, getSchedulerState as getAudioSchedulerState} from '@/src/lib/rss/audioFeedRouteHandler';
import {stopScheduler as stopArticleScheduler, getSchedulerState as getArticleSchedulerState} from '@/src/lib/rss/articleFeedRouteHandler';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {getClientIp} from '@/src/lib/net/getClientIp';

/**
 * Auth: requires `DIAGNOSTICS_TOKEN` (same as `/api/diagnostics`).
 * - Provide via `?token=...` or `x-m10z-diagnostics-token` header.
 *
 * Behavior:
 * - Stops both RSS feed refresh schedulers (audio + article).
 * - Returns a detailed before/after scheduler state snapshot.
 *
 * Notes:
 * - In production, schedulers should usually run continuously; this endpoint is primarily for deployments/testing.
 */
export async function GET(request: Request) {
    const expected = process.env.DIAGNOSTICS_TOKEN ?? null;
    const {searchParams} = new URL(request.url);
    const provided = searchParams.get('token') ?? request.headers.get('x-m10z-diagnostics-token');

    if (!verifySecret(provided, expected)) {
        return new NextResponse('Unauthorized', {status: 401});
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`diag-reset:${ip}`, {windowMs: 60_000, max: 10});
    if (!rl.ok) {
        return new NextResponse('Too Many Requests', {
            status: 429,
            headers: {'Retry-After': String(rl.retryAfterSeconds)},
        });
    }

    const audioBefore = getAudioSchedulerState();
    const articleBefore = getArticleSchedulerState();

    stopAudioScheduler();
    stopArticleScheduler();

    const audioAfter = getAudioSchedulerState();
    const articleAfter = getArticleSchedulerState();

    return NextResponse.json({
        now: Date.now(),
        memory: process.memoryUsage(),
        audio: {
            previous: audioBefore,
            stopped: audioBefore.schedulerStarted || audioBefore.hasTimer,
            current: audioAfter,
        },
        article: {
            previous: articleBefore,
            stopped: articleBefore.schedulerStarted || articleBefore.hasTimer,
            current: articleAfter,
        },
    });
}


