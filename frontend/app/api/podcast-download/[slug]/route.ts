import {after, NextResponse} from 'next/server';

import {
    isAllowedDownloadTarget,
    isPodcastDownloadTrackingEnabled,
    shouldRecordDownloadDeduped,
    shouldRecordDownloadForRange,
} from '@/src/lib/analytics/podcastDownload';
import {sendPodcastDownloadEvent} from '@/src/lib/analytics/umamiServer';
import {getErrorMessage} from '@/src/lib/errors';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {getClientIp} from '@/src/lib/net/getClientIp';
import {mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/strapi/media';
import {getStrapiApiBaseUrl} from '@/src/lib/strapiTransport';
import {fetchPodcastBySlug} from '@/src/lib/strapiContent';
import {type SlugPageParams} from '@/src/lib/params';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The tracking URL carries a fake `.mp3` extension (see `buildPodcastDownloadPath`) so podcatchers
// treat the enclosure URL as a valid audio file. Strip it before slug validation/lookup. Since
// `validateSlug` disallows dots, this is unambiguous and never affects a legitimate slug.
const TRAILING_MP3_SUFFIX = /\.mp3$/i;

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
 * Redirects a podcast download request to its validated audio file and records download tracking when enabled.
 *
 * Removes a trailing `.mp3` suffix before resolving the podcast. Returns `404 Not Found` for invalid or unknown slugs, missing audio files, or disallowed audio URLs; returns `503 Service Unavailable` with `Retry-After` when the CMS lookup itself fails.
 *
 * @returns A redirect response to the podcast audio file, a `404 Not Found`, or a `503 Service Unavailable`.
 */
export async function GET(request: Request, {params}: SlugPageParams) {
    const {slug: rawSlug} = await params;
    // Trim first: the suffix is `$`-anchored, so trailing whitespace would stop the
    // strip. Then use the guard's return value — the trimmed string is what every
    // later step (query, cache tag, dedupe key) must use.
    const slug = validateSlugSafe(rawSlug.trim().replace(TRAILING_MP3_SUFFIX, ''));
    if (!slug) {
        return new NextResponse('Not Found', {status: 404});
    }

    let fileUrl: string | undefined;
    let title: string | null = null;
    let podcast: Awaited<ReturnType<typeof fetchPodcastBySlug>> = null;
    try {
        podcast = await fetchPodcastBySlug(slug);
    } catch (error) {
        // A Strapi outage is not "this episode does not exist": 404 tells
        // podcatchers the file is gone and they may stop retrying.
        console.error(`[podcast-download] lookup failed for slug "${slug}": ${getErrorMessage(error)}`);
        return new NextResponse('Service Unavailable', {
            status: 503,
            headers: {'Retry-After': '30', 'Cache-Control': 'no-store'},
        });
    }

    if (!podcast) {
        return new NextResponse('Not Found', {status: 404});
    }
    title = podcast.title;
    fileUrl = mediaUrlToAbsolute({media: normalizeStrapiMedia(podcast.file)});

    if (!fileUrl || !isAllowedDownloadUrl(fileUrl)) {
        return new NextResponse('Not Found', {status: 404});
    }

    // Record the custom event after the response is flushed so it never delays the download.
    // Only when tracking is enabled (single source of truth), skip seek/continuation range
    // requests, and deduplicate per slug + client IP so a single play or download counts once.
    if (
        // Next auto-implements HEAD by calling GET; an availability probe is not
        // a download and must not consume the dedup slot of the real request.
        request.method !== 'HEAD' &&
        isPodcastDownloadTrackingEnabled() &&
        shouldRecordDownloadForRange(request.headers.get('range')) &&
        shouldRecordDownloadDeduped(slug, getClientIp(request))
    ) {
        after(() => sendPodcastDownloadEvent({slug, title, request}));
    }

    const response = NextResponse.redirect(fileUrl, 302);
    // Prevent intermediaries from caching the redirect, which would bypass download counting.
    response.headers.set('Cache-Control', 'no-store');
    return response;
}
