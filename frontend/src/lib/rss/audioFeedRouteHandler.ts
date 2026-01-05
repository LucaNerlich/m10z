import qs from 'qs';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
    type AudioFeedConfig,
    type AudioFeedTiming,
    type AudioFeedMarkdownConverter,
    generateAudioFeedXml,
    type StrapiAudioFeedSingle,
    type StrapiPodcast,
} from '@/src/lib/rss/audiofeed';
import {markdownToHtml} from '@/src/lib/rss/markdownToHtml';
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
let schedulerTimer: ReturnType<typeof setInterval> | null = null;

// Runtime health tracking (long-lived scheduler)
let schedulerStartedAtMs: number | null = null;
let initialBuildDurationMs: number | null = null;
const buildDurationsMs: number[] = [];
const BUILD_HISTORY_LIMIT = 20;
const SLOW_BUILD_WINDOW = 3;
const SLOW_BUILD_MULTIPLIER = 2;

type LastBuildTiming = {
    episodeCount: number;
    renderedEpisodeCount: number;
    timing: AudioFeedTiming;
    avgPerEpisodeMs: {
        markdownConversionMs: number;
        guidGenerationMs: number;
        fileMetadataMs: number;
        enclosureMs: number;
    };
    markdownCache?: {hits: number; misses: number; size: number};
};

let lastBuildTiming: LastBuildTiming | null = null;

export function resetAudioFeedStateForDiagnostics(reason: 'manual' = 'manual') {
    resetAudioFeedState(reason);
}

// `module.hot` is injected by the dev bundler for HMR; not present in production/runtime node.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

/**
 * Stops the background feed refresh scheduler (if running).
 *
 * This is mainly useful for local development/HMR and for operational tooling (deployments/tests).
 * In production the scheduler is expected to run continuously.
 */
export function stopScheduler() {
    if (schedulerTimer) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
    }
    schedulerStarted = false;
    schedulerStartedAtMs = null;
}

export function getSchedulerState() {
    return {
        schedulerStarted,
        hasTimer: schedulerTimer !== null,
    };
}

export function getAudioFeedRuntimeState() {
    const now = Date.now();
    const uptimeMs = schedulerStartedAtMs ? now - schedulerStartedAtMs : 0;
    const last3 = buildDurationsMs.slice(-SLOW_BUILD_WINDOW);
    const hasEnough = last3.length === SLOW_BUILD_WINDOW && initialBuildDurationMs !== null;
    const thresholdMs = initialBuildDurationMs ? initialBuildDurationMs * SLOW_BUILD_MULTIPLIER : null;
    const wouldTrigger =
        hasEnough && thresholdMs !== null ? last3.every((d) => d > thresholdMs) : false;

    const trend =
        buildDurationsMs.length >= 5
            ? (() => {
                  const first = buildDurationsMs[0] ?? 0;
                  const last = buildDurationsMs[buildDurationsMs.length - 1] ?? 0;
                  if (first <= 0) return 'unknown';
                  const ratio = last / first;
                  if (ratio >= 1.25) return 'increasing';
                  if (ratio <= 0.85) return 'decreasing';
                  return 'stable';
              })()
            : 'unknown';

    return {
        schedulerStarted,
        hasTimer: schedulerTimer !== null,
        schedulerStartedAtMs,
        uptimeMs,
        initialBuildDurationMs,
        buildCount: buildDurationsMs.length,
        recentBuildDurationsMs: buildDurationsMs.slice(),
        trend,
        threshold: {
            window: SLOW_BUILD_WINDOW,
            multiplier: SLOW_BUILD_MULTIPLIER,
            thresholdMs,
            wouldTrigger,
        },
        lastBuildTiming,
    };
}

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

    // Per-build markdown cache (cleared every rebuild, reused only within a single build)
    const markdownCache = new Map<string, string>();
    let markdownCacheHits = 0;
    let markdownCacheMisses = 0;

    const markdownConverter: AudioFeedMarkdownConverter = ({episodeId, kind, markdownText}) => {
        if (!markdownText) return '';
        const key = `${episodeId}:${kind}:${sha256Hex(markdownText)}`;
        const hit = markdownCache.get(key);
        if (hit !== undefined) {
            markdownCacheHits += 1;
            return hit;
        }
        markdownCacheMisses += 1;
        const html = markdownToHtml(markdownText);
        markdownCache.set(key, html);
        return html;
    };

    const {xml, etagSeed, lastModified, timing, renderedEpisodeCount} = generateAudioFeedXml({
        cfg,
        channel: feed.channel,
        episodeFooter: feed.episodeFooter,
        episodes,
        markdownConverter,
    });

    // Strong-ish ETag tied to latest publish + count (same across instances).
    // Include XML content to ensure content-only changes update the ETag.
    const etag = `"${sha256Hex(`${etagSeed}:${sha256Hex(xml)}`)}"`;

    // Store timing for diagnostics consumers (average-per-episode semantics)
    const avgPerEpisodeMs = {
        markdownConversionMs: timing.markdownConversion.avgMs,
        guidGenerationMs: timing.guidGeneration.avgMs,
        fileMetadataMs: timing.fileMetadata.avgMs,
        enclosureMs: timing.enclosure.avgMs,
    };
    lastBuildTiming = {
        episodeCount: episodes.length,
        renderedEpisodeCount,
        timing,
        avgPerEpisodeMs,
        markdownCache: {hits: markdownCacheHits, misses: markdownCacheMisses, size: markdownCache.size},
    };
    return {xml, etag, lastModified, episodeCount: episodes.length};
}

async function refreshFeed(): Promise<CachedFeed> {
    if (inflight) {
        return inflight;
    }

    inflight = (async () => {
        const startedAt = Date.now();
        const memStart = process.memoryUsage();
        const built = await getCachedAudioFeed();
        const memEnd = process.memoryUsage();
        const durationMs = Date.now() - startedAt;
        const memoryUsedMB = Math.round((memEnd.heapUsed / (1024 * 1024)) * 100) / 100;
        const memoryDeltaMB =
            Math.round(((memEnd.heapUsed - memStart.heapUsed) / (1024 * 1024)) * 100) / 100;
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

        // Update health tracking (successful builds only)
        if (initialBuildDurationMs === null) {
            initialBuildDurationMs = durationMs;
        }
        buildDurationsMs.push(durationMs);
        if (buildDurationsMs.length > BUILD_HISTORY_LIMIT) {
            buildDurationsMs.splice(0, buildDurationsMs.length - BUILD_HISTORY_LIMIT);
        }

        // Threshold check: if last 3 builds exceed 2x initial build time, schedule a reset.
        const thresholdMs = initialBuildDurationMs * SLOW_BUILD_MULTIPLIER;
        const last3 = buildDurationsMs.slice(-SLOW_BUILD_WINDOW);
        const shouldReset =
            last3.length === SLOW_BUILD_WINDOW && last3.every((d) => d > thresholdMs);

        if (durationMs >= 500) {
            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'route',
                name: 'feed.audio.build',
                ok: true,
                durationMs,
                detail: {
                    episodes: built.episodeCount,
                    memoryUsedMB,
                    memoryDeltaMB,
                    ...(lastBuildTiming
                        ? {
                              markdownConversionMs: lastBuildTiming.avgPerEpisodeMs.markdownConversionMs,
                              guidGenerationMs: lastBuildTiming.avgPerEpisodeMs.guidGenerationMs,
                              fileMetadataMs: lastBuildTiming.avgPerEpisodeMs.fileMetadataMs,
                              enclosureMs: lastBuildTiming.avgPerEpisodeMs.enclosureMs,
                              timing: lastBuildTiming.timing,
                              renderedEpisodeCount: lastBuildTiming.renderedEpisodeCount,
                              markdownCache: lastBuildTiming.markdownCache,
                          }
                        : {}),
                    reset: shouldReset
                        ? {scheduled: true, reason: 'slow_build', last3, thresholdMs, multiplier: SLOW_BUILD_MULTIPLIER}
                        : {scheduled: false},
                },
            });
        }

        if (shouldReset) {
            // Avoid resetting synchronously inside the build path; schedule after current stack.
            queueMicrotask(() => {
                try {
                    resetAudioFeedState('slow_build');
                } catch {
                    // ignore
                }
            });
        }

        return next;
    })().catch((err) => {
        inflight = null;
        throw err;
    });

    return inflight;
}

function resetAudioFeedState(reason: 'slow_build' | 'manual') {
    cachedFeed = null;
    inflight = null;
    initialBuildDurationMs = null;
    buildDurationsMs.splice(0, buildDurationsMs.length);
    lastBuildTiming = null;

    recordDiagnosticEvent({
        ts: Date.now(),
        kind: 'route',
        name: 'feed.audio.reset',
        ok: true,
        durationMs: 0,
        detail: {reason},
    });

    // Restart scheduler to ensure a clean interval loop (best-effort).
    stopScheduler();
    ensureScheduler();
}

function ensureScheduler() {
    if (schedulerStarted) return;
    schedulerStarted = true;
    schedulerStartedAtMs = Date.now();
    // Kick off an initial refresh in the background.
    void refreshFeed().catch(() => undefined);
    schedulerTimer = setInterval(() => {
        void refreshFeed().catch(() => undefined);
    }, FEED_REGENERATE_MS);
    // Don't keep the process alive just for the timer.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (schedulerTimer as any).unref?.();
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

if (typeof module !== 'undefined' && module.hot) {
    module.hot.dispose(() => {
        stopScheduler();
    });
}