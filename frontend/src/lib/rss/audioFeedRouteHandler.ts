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
import {getClientIp} from '@/src/lib/net/getClientIp';
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
let warmupStarted = false;

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

/**
 * Reset the in-memory audio feed state for diagnostics and restart the scheduler.
 *
 * @param reason - The reason for the reset; currently `"manual"` is used for user-initiated diagnostics resets
 */
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

/**
 * Gets current scheduler state for the audio feed.
 *
 * @returns An object with `schedulerStarted` — `true` if the scheduler was started, and `hasTimer` — `true` if a periodic timer is currently active.
 */
export function getSchedulerState() {
    return {
        schedulerStarted,
        hasTimer: schedulerTimer !== null,
    };
}

/**
 * Provides runtime diagnostics and health metrics for the audio feed scheduler and recent builds.
 *
 * @returns An object containing:
 *  - `schedulerStarted` and `hasTimer` indicating scheduler state,
 *  - `schedulerStartedAtMs` and `uptimeMs` for uptime tracking,
 *  - `initialBuildDurationMs`, `buildCount`, and `recentBuildDurationsMs` for build timing history,
 *  - `trend` describing build-duration trend (`increasing`, `decreasing`, `stable`, or `unknown`),
 *  - `threshold` with `window`, `multiplier`, `thresholdMs`, and `wouldTrigger` showing the slow-build reset threshold and whether it would currently trigger,
 *  - `lastBuildTiming` with detailed timing and optional markdown cache metrics for the most recent build.
 */
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

/**
 * Warm the feed once per process/module load:
 * - Load any persisted feed from disk into memory immediately (best-effort)
 * - Kick off one build in the background (best-effort)
 *
 * This reduces chances of serving a fallback or stale content during local testing.
 */
function ensureWarmup() {
    if (warmupStarted) return;
    warmupStarted = true;
    void (async () => {
        try {
            const disk = await readFeedFromDisk();
            if (disk) cachedFeed = disk;
        } catch {
            // ignore
        }
        try {
            await refreshFeed();
        } catch {
            // ignore
        }
    })();
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
    const revalidate = process.env.NODE_ENV === 'production' ? CACHE_REVALIDATE_DEFAULT : 0;
    return await fetchStrapiJsonCore<T>({
        strapiBaseUrl: STRAPI_URL,
        apiPathWithQuery: pathWithQuery,
        token: STRAPI_TOKEN,
        tags: ['feed:audio', 'strapi:podcast', 'strapi:audio-feed'],
        revalidate,
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

/**
 * Builds the audio feed XML and its metadata by fetching channel and episode data, rendering episode markdown, and computing an ETag.
 *
 * The function performs a single in-memory build: it fetches the channel and episode records, converts episode markdown to HTML using a per-build cache, generates the feed XML, computes a content-tied ETag, and updates runtime build timing and markdown-cache metrics exposed via `lastBuildTiming`.
 *
 * @returns An object with:
 * - `xml` — The generated RSS feed XML string.
 * - `etag` — A strong ETag value representing the feed content and seed.
 * - `lastModified` — The feed's last-modified timestamp as produced by the feed generator.
 * - `episodeCount` — The total number of episodes fetched from Strapi.
 */
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

/**
 * Refreshes the audio feed cache by rebuilding the feed and persisting the result to disk.
 *
 * Coalesces concurrent callers so only one build runs at a time, updates the in-memory `cachedFeed`,
 * records build diagnostics and timing, and may schedule a state reset if recent builds are repeatedly slow.
 *
 * @returns The refreshed `CachedFeed` containing `xml`, `etag`, `lastModified`, `builtAtMs`, and `episodeCount`.
 */
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

/**
 * Clears in-memory audio feed state, records a diagnostic reset event, and restarts the background scheduler.
 *
 * @param reason - Reason for the reset: `slow_build` when the build cadence is deemed too slow, or `manual` for an explicit/manual reset.
 */
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

/**
 * Starts the background scheduler that periodically refreshes the audio feed.
 *
 * If the scheduler is already running this is a no-op. When started, it triggers an initial refresh in the background and schedules recurring refreshes every `FEED_REGENERATE_MS`; the underlying timer is unref'd so it does not keep the process alive.
 */
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
    ensureWarmup();
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
        // In development, avoid serving potentially stale disk caches from previous runs.
        const allowDiskFreshness = process.env.NODE_ENV === 'production';
        const freshEnough = allowDiskFreshness && disk ? now - disk.builtAtMs < FEED_REGENERATE_MS * 2 : false;
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
        // Prefer serving a cached (possibly stale) feed over an empty fallback when available.
        const stale = cachedFeed ?? (await readFeedFromDisk().catch(() => null));
        if (stale) {
            const headers = buildRssHeaders({
                etag: stale.etag,
                lastModified: stale.lastModified,
                cacheControl: 'no-store',
            });
            const maybe304 = maybeReturn304(request, stale.etag, headers);
            if (maybe304) return maybe304;
            return new Response(stale.xml, {headers});
        }

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
            detail:
                err instanceof Error
                    ? {
                          // Keep error reporting non-sensitive: message should not include secrets.
                          errorName: err.name,
                          errorMessage: err.message,
                      }
                    : {errorName: 'UnknownError'},
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