import {NextResponse} from 'next/server';

import {verifySecret} from '@/src/lib/security/verifySecret';
import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {getMarkdownToHtmlState} from '@/src/lib/rss/markdownToHtml';
import {getAudioFeedRuntimeState} from '@/src/lib/rss/audioFeedRouteHandler';
import {getClientIp} from '@/src/lib/net/getClientIp';

/**
 * Handle GET requests for the diagnostics route by authenticating the caller, enforcing a per-IP rate limit, and returning runtime diagnostic state.
 *
 * @returns A NextResponse with:
 * - `401` when authentication fails,
 * - `429` with a `Retry-After` header when the rate limit is exceeded,
 * - `200` with a JSON payload containing `now` (timestamp), `memory` (process memory usage), `markdownToHtml` (markdown-to-HTML runtime state), and `audioFeed` (audio feed runtime state) on success.
 */
export async function GET(request: Request) {
    const expected = process.env.DIAGNOSTICS_TOKEN ?? null;
    const {searchParams} = new URL(request.url);
    const provided = searchParams.get('token') ?? request.headers.get('x-m10z-diagnostics-token');

    if (!verifySecret(provided, expected)) {
        return new NextResponse('Unauthorized', {status: 401});
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`diag-library-state:${ip}`, {windowMs: 60_000, max: 30});
    if (!rl.ok) {
        return new NextResponse('Too Many Requests', {
            status: 429,
            headers: {'Retry-After': String(rl.retryAfterSeconds)},
        });
    }

    return NextResponse.json({
        now: Date.now(),
        memory: process.memoryUsage(),
        markdownToHtml: getMarkdownToHtmlState(),
        audioFeed: getAudioFeedRuntimeState(),
    });
}

