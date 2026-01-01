import qs from 'qs';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
    type AudioFeedConfig,
    generateAudioFeedXml,
    type StrapiAudioFeedSingle,
    type StrapiPodcast,
} from '@/src/lib/rss/audiofeed';
import {sha256Hex} from '@/src/lib/rss/xml';
import {
    buildRssHeaders,
    fallbackFeedXml,
    fetchStrapiJson as fetchStrapiJsonCore,
    maybeReturn304,
} from '@/src/lib/rss/feedRoute';
import {CACHE_REVALIDATE_DEFAULT} from '@/src/lib/cache/constants';
import {
    populateBaseMedia,
    populateAuthorAvatar,
    populateCategoryBase,
    MEDIA_FIELDS,
} from '@/src/lib/strapiContent';
import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {recordDiagnosticEvent} from '@/src/lib/diagnostics/runtimeDiagnostics';

const SITE_URL = (process.env.NEXT_PUBLIC_DOMAIN ?? 'https://m10z.de').replace(/\/+$/, '');
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL
    ? process.env.NEXT_PUBLIC_STRAPI_URL.replace(/\/+$/, '')
    : '';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

const FEED_REGENERATE_MS = Number(process.env.FEED_REGENERATE_MS ?? '') || 30 * 60_000;
const FEED_CACHE_DIR = process.env.FEED_CACHE_DIR ?? path.join(process.cwd(), '.feed-cache');
const AUDIO_FEED_PATH = path.join(FEED_CACHE_DIR, 'audiofeed.xml');
const AUDIO_FEED_META_PATH = path.join(FEED_CACHE_DIR, 'audiofeed.meta.json');

type CachedFeed = {
    xml: string;
    etag: string;
    lastModified: Date | null | undefined;
    builtAtMs: number;
    episodeCount: number;
};

let cachedFeed: CachedFeed | null = null;
let inflight: Promise<CachedFeed> | null = null;
let schedulerStarted = false;

function getClientIp(request: Request): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() || 'unknown';
    return request.headers.get('x-real-ip') ?? 'unknown';
}

async function ensureFeedDir() {
    await fs.mkdir(FEED_CACHE_DIR, {recursive: true});
}

async function writeFeedToDisk(feed: CachedFeed) {
    await ensureFeedDir();
    await fs.writeFile(AUDIO_FEED_PATH, feed.xml, 'utf8');
    await fs.writeFile(
        AUDIO_FEED_META_PATH,
        JSON.stringify(
            {
                etag: feed.etag,
                builtAtMs: feed.builtAtMs,
                lastModified: feed.lastModified ? feed.lastModified.toISOString() : null,
                episodeCount: feed.episodeCount,
            },
            null,
            2,
        ),
        'utf8',
    );
}

async function readFeedFromDisk(): Promise<CachedFeed | null> {
    try {
        const [xml, metaRaw] = await Promise.all([
            fs.readFile(AUDIO_FEED_PATH, 'utf8'),
            fs.readFile(AUDIO_FEED_META_PATH, 'utf8'),
        ]);
        const meta = JSON.parse(metaRaw) as {
            etag?: string;
            builtAtMs?: number;
            lastModified?: string | null;
            episodeCount?: number;
        };

        if (!meta.etag || !meta.builtAtMs) return null;

        return {
            xml,
            etag: meta.etag,
            builtAtMs: meta.builtAtMs,
            lastModified: meta.lastModified ? new Date(meta.lastModified) : null,
            episodeCount: meta.episodeCount ?? 0,
        };
    } catch {
        return null;
    }
}

async function fetchStrapiJson<T>(pathWithQuery: string): Promise<T> {
    if (!STRAPI_URL) throw new Error('Missing NEXT_PUBLIC_STRAPI_URL');
    return await fetchStrapiJsonCore<T>({
        strapiBaseUrl: STRAPI_URL,
        apiPathWithQuery: pathWithQuery,
        token: STRAPI_TOKEN,
        tags: ['feed:audio', 'strapi:podcast', 'strapi:audio-feed'],
        revalidate: CACHE_REVALIDATE_DEFAULT,
        timeoutMs: 30_000,
    });
}

/**
 * Fetches all published podcasts from Strapi, handling pagination until all pages are retrieved.
 *
 * The results are ordered by `publishedAt` descending and include each podcast's populated relations.
 *
 * @returns An array of `StrapiPodcast` objects retrieved from Strapi (empty array if none).
 */
async function fetchAllPodcasts(): Promise<StrapiPodcast[]> {
    const maxPages = 50; // safety: prevents runaway loops if pagination gets weird
    const maxItems = Number(process.env.FEED_AUDIO_MAX_ITEMS ?? '') || 1000; // configurable; default 1000
    const pageSize = 100;
    let page = 1;
    const all: StrapiPodcast[] = [];
    while (page <= maxPages && all.length < maxItems) {
        const query = qs.stringify(
            {
                sort: ['publishedAt:desc'],
                status: 'published',
                pagination: {pageSize, page},
                populate: {
                    base: populateBaseMedia,
                    authors: populateAuthorAvatar,
                    categories: populateCategoryBase,
                    file: {
                        populate: '*',
                    },
                },
                fields: ['slug', 'duration', 'shownotes', 'wordCount', 'publishedAt'],
            },
            {encodeValuesOnly: true},
        );

        const res = await fetchStrapiJson<{
            data: unknown[];
            meta?: {pagination?: {page: number; pageCount: number; total: number}};
        }>(`/api/podcasts?${query}`);

        const items = Array.isArray(res.data) ? (res.data as StrapiPodcast[]) : [];
        const remaining = Math.max(0, maxItems - all.length);
        if (remaining > 0) {
            all.push(...items.slice(0, remaining));
        }

        const pagination = res.meta?.pagination;
        const done =
            !pagination ||
            pagination.page >= pagination.pageCount ||
            items.length === 0;

        if (done) break;
        page++;
    }

    return all;
}

/**
 * Fetches the single audio feed entry from Strapi including channel image metadata.
 *
 * The returned object includes the channel and its image with these populated image fields:
 * `url`, `width`, `height`, `blurhash`, `alternativeText`, and `formats`.
 *
 * @returns The audio feed entry as stored in Strapi (`StrapiAudioFeedSingle`), containing channel data and populated image metadata.
 */
async function fetchAudioFeedSingle(): Promise<StrapiAudioFeedSingle> {
    const query = qs.stringify(
        {
            populate: {
                channel: {
                    populate: {image: {fields: MEDIA_FIELDS}},
                },
            },
        },
        {encodeValuesOnly: true},
    );
    const res = await fetchStrapiJson<{data: StrapiAudioFeedSingle}>(`/api/audio-feed?${query}`);
    return res.data;
}

function getAudioFeedDefaults(): AudioFeedConfig {
    return {
        siteUrl: SITE_URL,
        ttlSeconds: 60,
        language: 'de',
        copyright: 'All rights reserved',
        webMaster: 'm10z@posteo.de',
        authorEmail: 'm10z@posteo.de',
        itunesAuthor: 'M10Z',
        itunesExplicit: 'false',
        itunesType: 'episodic',
        podcastGuid: 'E9QfcR8TYeotS5ceJLmn',
    };
}

async function getCachedAudioFeed() {
    const [feed, episodes] = await Promise.all([fetchAudioFeedSingle(), fetchAllPodcasts()]);
    const cfg = getAudioFeedDefaults();
    const {xml, etagSeed, lastModified} = generateAudioFeedXml({
        cfg,
        channel: feed.channel,
        episodeFooter: feed.episodeFooter,
        episodes,
    });

    // Strong-ish ETag tied to latest publish + count (same across instances).
    // Include XML content to ensure content-only changes update the ETag.
    const etag = `"${sha256Hex(`${etagSeed}:${sha256Hex(xml)}`)}"`;
    return {xml, etag, lastModified, episodeCount: episodes.length};
}

async function refreshFeed(): Promise<CachedFeed> {
    const now = Date.now();
    const ttlMs = FEED_REGENERATE_MS;

    if (inflight) {
        return inflight;
    }

    inflight = (async () => {
        const startedAt = Date.now();
        const built = await getCachedAudioFeed();
        const durationMs = Date.now() - startedAt;
        const next: CachedFeed = {
            xml: built.xml,
            etag: built.etag,
            lastModified: built.lastModified,
            builtAtMs: Date.now(),
            episodeCount: built.episodeCount,
        };
        cachedFeed = next;
        inflight = null;
        // Best-effort persist so future requests can serve without rebuild.
        await writeFeedToDisk(next);

        if (durationMs >= 500) {
            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'route',
                name: 'feed.audio.build',
                ok: true,
                durationMs,
                detail: {episodes: built.episodeCount},
            });
        }

        return next;
    })().catch((err) => {
        inflight = null;
        throw err;
    });

    return inflight;
}

function ensureScheduler() {
    if (schedulerStarted) return;
    schedulerStarted = true;
    // Kick off an initial refresh in the background.
    void refreshFeed().catch(() => undefined);
    const timer = setInterval(() => {
        void refreshFeed().catch(() => undefined);
    }, FEED_REGENERATE_MS);
    // Don't keep the process alive just for the timer.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (timer as any).unref?.();
}

export async function buildAudioFeedResponse(request: Request): Promise<Response> {
    ensureScheduler();

    // Prevent self-DoS: feeds are attractive to spam and can be expensive to build.
    const ip = getClientIp(request);
    const rl = checkRateLimit(`feed:audio:${ip}`, {windowMs: 60_000, max: 20});
    if (!rl.ok) {
        const fallback = fallbackFeedXml({
            title: 'M10Z Podcasts',
            link: SITE_URL,
            selfLink: `${SITE_URL}/audiofeed.xml`,
            description: 'Rate limited. Please try again shortly.',
        });
        const headers = buildRssHeaders({
            cacheControl: 'no-store',
        });
        headers.set('Retry-After', String(rl.retryAfterSeconds));
        recordDiagnosticEvent({
            ts: Date.now(),
            kind: 'route',
            name: 'feed.audio.rate_limit',
            ok: false,
            durationMs: 0,
            detail: {retryAfterSeconds: rl.retryAfterSeconds},
        });
        return new Response(fallback, {
            status: 429,
            headers,
        });
    }

    try {
        // Prefer on-disk cached feed (fast, no rebuild). Fall back to refresh on cache miss/staleness.
        const now = Date.now();
        const disk = await readFeedFromDisk();
        const freshEnough = disk ? now - disk.builtAtMs < FEED_REGENERATE_MS * 2 : false;
        const feed = disk && freshEnough ? disk : await refreshFeed();

        // Encourage clients to revalidate on every request; server-side fetch remains cached by tags.
        const headers = buildRssHeaders({
            etag: feed.etag,
            lastModified: feed.lastModified,
            // Browsers may still hard-refresh, but shared caches (CDN/proxy) can absorb load.
            cacheControl: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, must-revalidate',
        });
        const maybe304 = maybeReturn304(request, feed.etag, headers);
        if (maybe304) return maybe304;

        return new Response(feed.xml, {headers});
    } catch (err) {
        const fallback = fallbackFeedXml({
            title: 'M10Z Podcasts',
            link: SITE_URL,
            selfLink: `${SITE_URL}/audiofeed.xml`,
            description: 'Feed temporarily unavailable',
        });

        recordDiagnosticEvent({
            ts: Date.now(),
            kind: 'route',
            name: 'feed.audio.serve',
            ok: false,
            durationMs: 0,
        });

        return new Response(fallback, {
            status: 503,
            headers: buildRssHeaders({
                cacheControl: 'no-store',
            }),
        });
    }
}