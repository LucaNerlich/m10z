import {after, NextResponse} from 'next/server';

import {
    isAllowedDownloadTarget,
    isPodcastDownloadTrackingEnabled,
    shouldRecordDownloadForRange,
} from '@/src/lib/analytics/podcastDownload';
import {sendPodcastDownloadEvent} from '@/src/lib/analytics/umamiServer';
import {getErrorMessage} from '@/src/lib/errors';
import {mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/strapi/media';
import {getStrapiApiBaseUrl} from '@/src/lib/strapi';
import {fetchPodcastBySlug} from '@/src/lib/strapiContent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Strapi slugs are lowercase, alphanumeric, dash-separated. Reject anything else to prevent
// path traversal / injection before the value is used in a Strapi query.
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

type RouteContext = {
    params: Promise<{slug: string}>;
};

/**
 * Determines whether a download URL is allowed for redirection.
 *
 * @param fileUrl - The target URL to check.
 * @returns `true` if the URL points to the configured Strapi origin or an allowed host, `false` otherwise.
 */
function isAllowedDownloadUrl(fileUrl: string): boolean {
    let strapiOrigin: string | null = null;
    try {
        strapiOrigin = getStrapiApiBaseUrl().origin;
    } catch {
        // STRAPI_URL not configured — rely on the explicit allowlist only.
    }

    const allowedHosts = (process.env.PODCAST_DOWNLOAD_ALLOWED_HOSTS ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

    return isAllowedDownloadTarget(fileUrl, {strapiOrigin, allowedHosts});
}

/**
 * Redirects a podcast download request to the underlying audio file and records download tracking when enabled.
 *
 * Returns 404 for invalid or unknown slugs, or when the resolved audio URL is not allowed.
 */
export async function GET(request: Request, {params}: RouteContext) {
    const {slug} = await params;

    if (!SLUG_PATTERN.test(slug)) {
        return new NextResponse('Not Found', {status: 404});
    }

    let fileUrl: string | undefined;
    let title: string | null = null;
    try {
        const podcast = await fetchPodcastBySlug(slug);
        if (!podcast) {
            return new NextResponse('Not Found', {status: 404});
        }
        title = podcast.title;
        fileUrl = mediaUrlToAbsolute({media: normalizeStrapiMedia(podcast.file)});
    } catch (error) {
        // Fail securely: never redirect to an unverified target if the lookup failed.
        console.error(`[podcast-download] lookup failed for slug "${slug}": ${getErrorMessage(error)}`);
        return new NextResponse('Not Found', {status: 404});
    }

    if (!fileUrl || !isAllowedDownloadUrl(fileUrl)) {
        return new NextResponse('Not Found', {status: 404});
    }

    // Record the custom event after the response is flushed so it never delays the download.
    // Only when tracking is enabled (single source of truth), and skip seek/continuation range
    // requests so a single play or download counts once.
    if (isPodcastDownloadTrackingEnabled() && shouldRecordDownloadForRange(request.headers.get('range'))) {
        after(() => sendPodcastDownloadEvent({slug, title, request}));
    }

    const response = NextResponse.redirect(fileUrl, 302);
    // Prevent intermediaries from caching the redirect, which would bypass download counting.
    response.headers.set('Cache-Control', 'no-store');
    return response;
}
