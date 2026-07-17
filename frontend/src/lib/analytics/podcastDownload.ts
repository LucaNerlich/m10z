/**
 * Shared helpers for the podcast download-tracking endpoint (`/api/podcast-download/[slug]`).
 *
 * The same endpoint backs both the RSS `<enclosure>` URLs and the on-site audio player, so the URL
 * shape and the feature flag live here to keep the feed generator, the route, and the detail page
 * in sync.
 *
 * The generated URL carries a fake `.mp3` extension even though the path is actually served by an
 * API route rather than a static file: some podcatchers (including Apple Podcasts) sniff the
 * `<enclosure>` URL for a recognizable audio-file extension and reject or mishandle URLs that don't
 * look like audio files. The route strips the suffix before validating/looking up the slug.
 */

/**
 * Root-relative path of the download-tracking endpoint for an episode. Preferred for same-origin
 * usage like the on-site `<audio>` element.
 *
 * Appends a literal `.mp3` suffix after the URL-encoded slug so podcatchers that sniff the
 * enclosure URL's file extension treat it as a valid audio file (see module doc comment).
 */
export function buildPodcastDownloadPath(slug: string): string {
    return `/api/podcast-download/${encodeURIComponent(slug)}.mp3`;
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

// Upper bound for the raw client User-Agent recorded as Umami event data. Umami caps custom string
// data values around 500 chars; stay well under that and avoid storing unbounded header input.
const MAX_CLIENT_USER_AGENT_LENGTH = 256;

/**
 * Trim and length-cap a client User-Agent for storage as an Umami event `data` property. Returns
 * `null` for empty/whitespace-only input so the property can be omitted entirely.
 */
export function normalizeClientUserAgent(userAgent: string | null | undefined): string | null {
    const trimmed = userAgent?.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, MAX_CLIENT_USER_AGENT_LENGTH);
}

/**
 * Derive a coarse podcast-client label from a User-Agent for grouping downloads by app in Umami
 * (e.g. `AntennaPod/3.5.0` -> `AntennaPod`, `Mozilla/5.0 (...)` -> `Mozilla`). Returns the leading
 * product token before the first `/` or whitespace, or `null` when no usable token is present.
 */
export function podcastClientLabel(userAgent: string | null | undefined): string | null {
    const trimmed = userAgent?.trim();
    if (!trimmed) return null;
    const token = trimmed.split(/[/\s]/, 1)[0];
    return token || null;
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
