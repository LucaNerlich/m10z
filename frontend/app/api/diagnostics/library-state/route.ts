import {NextResponse} from 'next/server';

import {verifySecret} from '@/src/lib/security/verifySecret';
import {createRateLimiter} from '@/src/lib/security/rateLimit';
import {getMarkdownToHtmlState} from '@/src/lib/rss/markdownToHtml';
import {getAudioFeedRuntimeState} from '@/src/lib/rss/audioFeedRouteHandler';
import {getClientIp} from '@/src/lib/net/getClientIp';

// Own bucket store, so another endpoint's limiter filling up cannot fail this one closed.
const libraryStateLimiter = createRateLimiter({windowMs: 60_000, max: 30});

/**
 * Handle GET requests for the diagnostics route by rate-limiting the caller,
 * authenticating via the `x-m10z-diagnostics-token` header, and returning runtime
 * diagnostic state.
 *
 * @returns A NextResponse with:
 * - `429` with a `Retry-After` header when the rate limit is exceeded,
 * - `401` when authentication fails,
 * - `200` with a JSON payload containing `now` (timestamp), `memory` (process memory usage), `markdownToHtml` (markdown-to-HTML runtime state), and `audioFeed` (audio feed runtime state) on success.
 */
export async function GET(request: Request) {
    // Rate-limit before authentication so secret-guessing attempts are
    // throttled too.
    const ip = getClientIp(request);
    const rl = libraryStateLimiter.check(`diag-library-state:${ip}`);
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
            memory: process.memoryUsage(),
            markdownToHtml: getMarkdownToHtmlState(),
            audioFeed: getAudioFeedRuntimeState(),
        },
        {headers: {'Cache-Control': 'no-store'}},
    );
}
