/**
 * Shared helpers for the podcast download-tracking endpoint (`/api/podcast-download/[slug]`).
 *
 * The same endpoint backs both the RSS `<enclosure>` URLs and the on-site audio player, so the URL
 * shape and the feature flag live here to keep the feed generator, the route, and the detail page
 * in sync.
 */

/**
 * Root-relative path of the download-tracking endpoint for an episode. Preferred for same-origin
 * usage like the on-site `<audio>` element.
 */
export function buildPodcastDownloadPath(slug: string): string {
    return `/api/podcast-download/${encodeURIComponent(slug)}`;
}

/**
 * Absolute download-tracking URL for an episode. Required for off-site consumers such as the RSS
 * feed `<enclosure>` element.
 */
export function buildPodcastDownloadUrl(siteUrl: string, slug: string): string {
    return `${siteUrl.replace(/\/+$/, '')}${buildPodcastDownloadPath(slug)}`;
}

/**
 * Whether podcast download tracking is enabled. When true, both the RSS feed and the on-site audio
 * player route audio through the tracking endpoint so downloads/plays are recorded in Umami.
 */
export function isPodcastDownloadTrackingEnabled(): boolean {
    return process.env.FEED_AUDIO_TRACKING_ENABLED === 'true';
}

// Match a Range request that does not start at byte 0 (a seek/continuation). The on-site <audio>
// element issues many such requests while seeking/buffering; counting only initial requests keeps
// one play (or one download) from inflating the metric.
const RANGE_CONTINUATION = /^bytes=(?!0\b)\d+-/i;

/**
 * Whether a request with the given `Range` header should count as a download/play. Initial requests
 * (no Range header, or a Range starting at byte 0) count; non-zero Range requests
 * (seeks/continuations) do not.
 */
export function shouldRecordDownloadForRange(range: string | null | undefined): boolean {
    if (!range) return true;
    return !RANGE_CONTINUATION.test(range.trim());
}

/**
 * Open-redirect / SSRF guard for the download endpoint: a resolved file URL is only an allowed
 * redirect target when it shares the configured Strapi origin (matching the deployment's protocol)
 * or its host is in the explicit HTTPS allowlist (e.g. a media CDN).
 */
export function isAllowedDownloadTarget(
    fileUrl: string,
    options: {strapiOrigin?: string | null; allowedHosts?: readonly string[]},
): boolean {
    let parsed: URL;
    try {
        parsed = new URL(fileUrl);
    } catch {
        return false;
    }

    if (options.strapiOrigin && parsed.origin === options.strapiOrigin) return true;

    if (parsed.protocol === 'https:' && options.allowedHosts && options.allowedHosts.length > 0) {
        const host = parsed.hostname.toLowerCase();
        for (const entry of options.allowedHosts) {
            if (entry.trim().toLowerCase() === host) return true;
        }
    }

    return false;
}
