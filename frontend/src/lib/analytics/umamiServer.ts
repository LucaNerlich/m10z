import {getClientIp} from '@/src/lib/net/getClientIp';

/**
 * Custom Umami event name recorded for podcast downloads initiated via the RSS feed.
 * Kept short (<= 50 chars, the Umami event-name limit) and kebab-case to match the
 * client-side event ids produced by `umamiEventId`/`slugifyUmami`.
 */
export const PODCAST_DOWNLOAD_EVENT = 'podcast-download';

const UMAMI_SEND_TIMEOUT_MS = 2000;

// Umami silently drops events that arrive without a valid User-Agent header. When the
// originating client did not send one, fall back to a stable identifier for the feed.
const FALLBACK_USER_AGENT = 'M10Z-Feed/1.0 (+https://m10z.de)';

/**
 * Resolve the public site hostname reported to Umami as `payload.hostname`.
 */
function getReportingHostname(): string {
    const domain = process.env.NEXT_PUBLIC_DOMAIN ?? 'https://m10z.de';
    try {
        return new URL(domain).hostname;
    } catch {
        return 'm10z.de';
    }
}

/**
 * Record a custom Umami "podcast-download" event server-side.
 *
 * This is the server-side equivalent of the client `umami.track(name, data)` call: it POSTs to
 * Umami's `/api/send` collection endpoint with `type: "event"`, the custom event `name`, and the
 * filterable `data` properties. It is a no-op when `NEXT_PUBLIC_UMAMI_WEBSITE_ID` is unset (same
 * convention as the client `UmamiAnalytics` component).
 *
 * The call is intentionally fail-safe: any network/timeout error is swallowed so analytics never
 * affects the download redirect. No secrets, user agents, or IPs are logged.
 *
 * @param args.slug - Episode slug (used as the event url path and a `data` property).
 * @param args.title - Optional episode title, recorded as a `data` property when present.
 * @param args.request - The incoming download request; its `User-Agent`/IP are forwarded so Umami
 *   can attribute the visitor and filter bots.
 */
export async function sendPodcastDownloadEvent(args: {
    slug: string;
    title?: string | null;
    request: Request;
}): Promise<void> {
    const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
    if (!websiteId) return; // Tracking disabled.

    const {slug, title, request} = args;
    const umamiUrl = (process.env.NEXT_PUBLIC_UMAMI_URL || 'https://umami.m10z.de').replace(/\/+$/, '');

    // Forward the real client UA (REQUIRED by Umami) and IP so the download is attributed correctly.
    const userAgent = request.headers.get('user-agent') || FALLBACK_USER_AGENT;
    const clientIp = getClientIp(request);

    const body = JSON.stringify({
        type: 'event',
        payload: {
            website: websiteId,
            hostname: getReportingHostname(),
            url: `/podcasts/${slug}`,
            name: PODCAST_DOWNLOAD_EVENT,
            data: title ? {slug, title} : {slug},
        },
    });

    const headers: Record<string, string> = {
        'content-type': 'application/json',
        'user-agent': userAgent,
    };
    if (clientIp && clientIp !== 'unknown') {
        headers['x-forwarded-for'] = clientIp;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UMAMI_SEND_TIMEOUT_MS);
    try {
        await fetch(`${umamiUrl}/api/send`, {
            method: 'POST',
            headers,
            body,
            signal: controller.signal,
            cache: 'no-store',
        });
    } catch {
        // Fail securely: analytics errors must never break the download redirect.
    } finally {
        clearTimeout(timeout);
    }
}
