import {after, NextResponse} from 'next/server';

import {
    isAllowedDownloadTarget,
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
 * Open-redirect / SSRF guard: only allow redirecting to the configured Strapi origin (matching the
 * deployment's protocol, e.g. https in prod, http://localhost in dev) or to an explicit HTTPS host
 * allowlist (e.g. a media CDN) via `PODCAST_DOWNLOAD_ALLOWED_HOSTS`.
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
 * Drop-in replacement for a podcast RSS <enclosure> URL: records a custom Umami download event,
 * then 302-redirects to the real Strapi audio file. Returns 404 for unknown/invalid episodes or
 * when the resolved file URL is not on an allowed host.
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
    // Skip seek/continuation range requests so a single play or download counts once.
    if (shouldRecordDownloadForRange(request.headers.get('range'))) {
        after(() => sendPodcastDownloadEvent({slug, title, request}));
    }

    const response = NextResponse.redirect(fileUrl, 302);
    // Prevent intermediaries from caching the redirect, which would bypass download counting.
    response.headers.set('Cache-Control', 'no-store');
    return response;
}
