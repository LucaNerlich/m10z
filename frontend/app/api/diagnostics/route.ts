import {NextResponse} from 'next/server';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {getRecentDiagnosticEvents} from '@/src/lib/diagnostics/runtimeDiagnostics';
import {getAudioFeedRuntimeState} from '@/src/lib/rss/audioFeedRouteHandler';
import {getSchedulerState as getArticleFeedSchedulerState} from '@/src/lib/rss/articleFeedRouteHandler';

/**
 * Extracts the client's IP address from request headers, preferring `x-forwarded-for`.
 *
 * @param request - Incoming Request; checks the `x-forwarded-for` header first (uses the first comma-separated entry), then `x-real-ip`.
 * @returns The client's IP address as a string, or `'unknown'` if no relevant headers are present.
 */
function getClientIp(request: Request): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() || 'unknown';
    return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Handle GET requests to the diagnostics endpoint and return runtime diagnostics when authorized.
 *
 * Validates a token (query param `token` or header `x-m10z-diagnostics-token`) and enforces rate limiting.
 * Responds with 401 if authentication fails or 429 with a `Retry-After` header if rate limit is exceeded.
 *
 * @param request - The incoming HTTP request for the diagnostics endpoint.
 * @returns A NextResponse containing a JSON object with diagnostic data on success:
 *          `{ now: number, events: any[], memory: NodeJS.MemoryUsage, schedulers: { audioFeed: any, articleFeed: any } }`,
 *          or a NextResponse with status 401 (unauthorized) or 429 (rate limited).
 */
export async function GET(request: Request) {
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

