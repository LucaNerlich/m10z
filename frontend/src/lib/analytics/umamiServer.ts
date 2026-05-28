/**
 * Server-side Umami event tracking.
 *
 * Fires events to Umami's `/api/send` endpoint from the server.
 * This is used for tracking actions initiated by non-browser clients
 * (e.g., podcast apps fetching enclosure URLs from the RSS feed).
 *
 * All requests are fire-and-forget: they never block the caller and
 * errors are silently logged.
 */

type TrackServerEventParams = {
    eventName: string;
    urlPath: string;
    data?: Record<string, string | number | boolean>;
};

const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID ?? process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const UMAMI_URL = (process.env.UMAMI_URL ?? process.env.NEXT_PUBLIC_UMAMI_URL ?? 'https://umami.m10z.de').replace(/\/+$/, '');

/**
 * Send an event to Umami from the server.
 *
 * The fetch is intentionally fire-and-forget (not awaited) so it never
 * blocks the request path. Errors are caught and logged but never thrown.
 */
export function trackServerEvent(params: TrackServerEventParams): void {
    const {eventName, urlPath, data} = params;

    if (!UMAMI_WEBSITE_ID) {
        console.warn('[umami-server] Missing UMAMI_WEBSITE_ID, skipping event tracking');
        return;
    }

    const payload = {
        type: 'event',
        payload: {
            website: UMAMI_WEBSITE_ID,
            hostname: 'm10z.de',
            url: urlPath,
            name: eventName,
            ...(data ? {data} : {}),
        },
    };

    try {
        void fetch(`${UMAMI_URL}/api/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'm10z-server/1.0',
            },
            body: JSON.stringify(payload),
        }).catch((err: Error) => {
            console.warn(`[umami-server] Failed to send event "${eventName}": ${err.message}`);
        });
    } catch (err) {
        console.warn(`[umami-server] Exception sending event "${eventName}": ${err instanceof Error ? err.message : 'unknown'}`);
    }
}
