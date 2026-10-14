import {NextResponse} from 'next/server';

import {
    getSchedulerState as getAudioSchedulerState,
    stopScheduler as stopAudioScheduler,
} from '@/src/lib/rss/audioFeedRouteHandler';
import {
    getSchedulerState as getArticleSchedulerState,
    stopScheduler as stopArticleScheduler,
} from '@/src/lib/rss/articleFeedRouteHandler';
import {requireDiagnosticsAuth} from '@/src/lib/diagnostics/requireDiagnosticsAuth';

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
    const unauthorized = requireDiagnosticsAuth(request, {bucket: 'diag-reset', max: 10});
    if (unauthorized) return unauthorized;

    return stateResponse(false);
}

export async function POST(request: Request) {
    const unauthorized = requireDiagnosticsAuth(request, {bucket: 'diag-reset', max: 10});
    if (unauthorized) return unauthorized;

    const audioBefore = getAudioSchedulerState();
    const articleBefore = getArticleSchedulerState();

    stopAudioScheduler();
    stopArticleScheduler();

    return stateResponse(true, {audioBefore, articleBefore});
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
