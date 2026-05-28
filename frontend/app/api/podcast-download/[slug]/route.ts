import {after, NextResponse} from 'next/server';

import {sendPodcastDownloadEvent} from '@/src/lib/analytics/umamiServer';
import {getErrorMessage} from '@/src/lib/errors';
import {mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/rss/media';
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
 * Guard against open-redirect / SSRF: only allow redirecting to the configured Strapi origin
 * (matching the deployment's protocol, e.g. https in prod, http://localhost in dev) or to an
 * explicit HTTPS host allowlist (e.g. a media CDN) via `PODCAST_DOWNLOAD_ALLOWED_HOSTS`.
 */
function isAllowedDownloadUrl(fileUrl: string): boolean {
    let parsed: URL;
    try {
        parsed = new URL(fileUrl);
    } catch {
        return false;
    }

    try {
        if (parsed.origin === getStrapiApiBaseUrl().origin) return true;
    } catch {
        // STRAPI_URL not configured — fall through to the explicit allowlist.
    }

    const extra = process.env.PODCAST_DOWNLOAD_ALLOWED_HOSTS;
    if (extra && parsed.protocol === 'https:') {
        const host = parsed.hostname.toLowerCase();
        for (const entry of extra.split(',')) {
            if (entry.trim().toLowerCase() === host) return true;
        }
    }

    return false;
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
    after(() => sendPodcastDownloadEvent({slug, title, request}));

    const response = NextResponse.redirect(fileUrl, 302);
    // Prevent intermediaries from caching the redirect, which would bypass download counting.
    response.headers.set('Cache-Control', 'no-store');
    return response;
}
