import {NextResponse} from 'next/server';

import {trackServerEvent} from '@/src/lib/analytics/umamiServer';
import {mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/rss/media';
import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {getClientIp} from '@/src/lib/net/getClientIp';
import {getStrapiApiBaseUrl} from '@/src/lib/strapi';

const RATE_LIMIT = {windowMs: 60_000, max: 30} as const;

type RouteContext = {
    params: Promise<{slug: string}>;
};

/**
 * Lightweight podcast download tracker.
 *
 * Podcast clients (Apple Podcasts, Spotify, etc.) hit this endpoint via the
 * RSS feed's `<enclosure>` URL. We fire a server-side Umami event and then
 * redirect the client to the actual CDN-hosted MP3 file.
 *
 * Rate-limited to 30 requests/minute per IP to prevent abuse.
 */
export async function GET(request: Request, {params}: RouteContext) {
    const {slug} = await params;

    const ip = getClientIp(request);
    const rl = checkRateLimit(`podcast-download:${ip}`, RATE_LIMIT);
    if (!rl.ok) {
        return new NextResponse(null, {
            status: 429,
            headers: {
                'Retry-After': String(rl.retryAfterSeconds),
            },
        });
    }

    const base = getStrapiApiBaseUrl();
    const url = new URL('/api/podcasts', base);
    url.searchParams.set('filters[slug][$eq]', slug);
    url.searchParams.set('status', 'published');
    url.searchParams.set('populate[file]', '*');
    url.searchParams.set('fields[0]', 'slug');
    url.searchParams.set('pagination[pageSize]', '1');

    try {
        const res = await fetch(url, {cache: 'no-store'});
        if (!res.ok) {
            console.warn(`[podcast-download] Strapi returned ${res.status} for slug "${slug}"`);
            return new NextResponse(null, {status: 502});
        }

        const json = (await res.json()) as {data?: Array<{file?: unknown}>};
        const episode = json.data?.[0];
        if (!episode) {
            return new NextResponse(null, {status: 404});
        }

        const fileMedia = normalizeStrapiMedia(episode.file as Record<string, unknown> | null | undefined);
        const audioUrl = mediaUrlToAbsolute({media: fileMedia});
        if (!audioUrl) {
            return new NextResponse(null, {status: 404});
        }

        trackServerEvent({
            eventName: 'podcast-download',
            urlPath: `/api/podcast-download/${slug}`,
            data: {slug},
        });

        return NextResponse.redirect(audioUrl, {status: 302});
    } catch (err) {
        console.warn(`[podcast-download] Error fetching podcast "${slug}": ${err instanceof Error ? err.message : 'unknown'}`);
        return new NextResponse(null, {status: 502});
    }
}
