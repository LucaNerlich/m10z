import {NextResponse} from 'next/server';

import {
    getSchedulerState as getAudioSchedulerState,
    stopScheduler as stopAudioScheduler,
} from '@/src/lib/rss/audioFeedRouteHandler';
import {
    getSchedulerState as getArticleSchedulerState,
    stopScheduler as stopArticleScheduler,
} from '@/src/lib/rss/articleFeedRouteHandler';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {getClientIp} from '@/src/lib/net/getClientIp';

/**
 * Auth: requires `DIAGNOSTICS_TOKEN` (same as `/api/diagnostics`), provided via
 * the `x-m10z-diagnostics-token` header only.
 *
 * Behavior:
 * - `GET` returns a read-only scheduler state snapshot.
 * - `POST` stops both RSS feed refresh schedulers (audio + article) and returns
 *   a detailed before/after scheduler state snapshot.
 *
 * Notes:
 * - In production, schedulers should usually run continuously; this endpoint is primarily for deployments/testing.
 */
export async function GET(request: Request) {
    const unauthorized = checkAuthAndRateLimit(request);
    if (unauthorized) return unauthorized;

    return stateResponse(false);
}

export async function POST(request: Request) {
    const unauthorized = checkAuthAndRateLimit(request);
    if (unauthorized) return unauthorized;

    const audioBefore = getAudioSchedulerState();
    const articleBefore = getArticleSchedulerState();

    stopAudioScheduler();
    stopArticleScheduler();

    return stateResponse(true, {audioBefore, articleBefore});
}

function checkAuthAndRateLimit(request: Request): NextResponse | null {
    // Rate-limit before authentication so secret-guessing attempts are
    // throttled too.
    const ip = getClientIp(request);
    const rl = checkRateLimit(`diag-reset:${ip}`, {windowMs: 60_000, max: 10});
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

    return null;
}

function stateResponse(
    stopped: boolean,
    before?: {audioBefore: ReturnType<typeof getAudioSchedulerState>; articleBefore: ReturnType<typeof getArticleSchedulerState>},
): NextResponse {
    const audioAfter = getAudioSchedulerState();
    const articleAfter = getArticleSchedulerState();

    const audio = before
        ? {
              previous: before.audioBefore,
              stopped: before.audioBefore.schedulerStarted || before.audioBefore.hasTimer,
              current: audioAfter,
          }
        : {current: audioAfter};

    const article = before
        ? {
              previous: before.articleBefore,
              stopped: before.articleBefore.schedulerStarted || before.articleBefore.hasTimer,
              current: articleAfter,
          }
        : {current: articleAfter};

    return NextResponse.json(
        {
            now: Date.now(),
            memory: process.memoryUsage(),
            stopped,
            audio,
            article,
        },
        {headers: {'Cache-Control': 'no-store'}},
    );
}
