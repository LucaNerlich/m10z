import fs from 'node:fs/promises';
import path from 'node:path';

import {recordDiagnosticEvent} from '@/src/lib/diagnostics/runtimeDiagnostics';
import {getClientIp} from '@/src/lib/net/getClientIp';
import {checkRateLimit} from '@/src/lib/security/rateLimit';

import {buildRssHeaders, fallbackFeedXml, maybeReturn304} from './feedRoute';

const FEED_REGENERATE_MS = Number(process.env.FEED_REGENERATE_MS ?? '') || 30 * 60_000;
const FEED_CACHE_DIR = process.env.FEED_CACHE_DIR ?? path.join(process.cwd(), '.feed-cache');
const INVALIDATION_DEBOUNCE_MS = 10_000;
const RATE_LIMIT = {windowMs: 60_000, max: 20} as const;

const SITE_URL = (process.env.NEXT_PUBLIC_DOMAIN ?? 'https://m10z.de').replace(/\/+$/, '');

export type FeedBuilt = {
    xml: string;
    etag: string;
    lastModified: Date | null | undefined;
    itemCount: number;
};

export type CachedFeed = FeedBuilt & {
    builtAtMs: number;
};

export type BuildSuccessInfo = {
    durationMs: number;
    built: FeedBuilt;
    memoryUsedMB: number;
    memoryDeltaMB: number;
};

export type FeedSpec = {
    feedKey: string;
    diskFileName: string;
    fallback: {
        title: string;
        selfPath: string;
    };
    build: () => Promise<FeedBuilt>;
    onBuildSuccess?: (info: BuildSuccessInfo) => void;
};

export type FeedCache = {
    handle: (request: Request) => Promise<Response>;
    refresh: () => Promise<CachedFeed>;
    scheduleDebouncedRefresh: () => void;
    stopScheduler: () => void;
    getSchedulerState: () => {
        schedulerStarted: boolean;
        hasTimer: boolean;
        schedulerStartedAtMs: number | null;
    };
    reset: () => void;
};

export function createFeedCache(spec: FeedSpec): FeedCache {
    const xmlPath = path.join(FEED_CACHE_DIR, spec.diskFileName);
    const metaPath = path.join(FEED_CACHE_DIR, `${spec.diskFileName}.meta.json`);
    const selfLink = `${SITE_URL}${spec.fallback.selfPath}`;

    let cachedFeed: CachedFeed | null = null;
    let inflight: Promise<CachedFeed> | null = null;
    let schedulerStarted = false;
    let schedulerStartedAtMs: number | null = null;
    let schedulerTimer: ReturnType<typeof setInterval> | null = null;
    let warmupStarted = false;
    let invalidationTimer: ReturnType<typeof setTimeout> | null = null;

    async function ensureFeedDir() {
        await fs.mkdir(FEED_CACHE_DIR, {recursive: true});
    }

    async function writeFeedToDisk(feed: CachedFeed) {
        await ensureFeedDir();
        const tmpXml = `${xmlPath}.tmp`;
        const tmpMeta = `${metaPath}.tmp`;
        await Promise.all([
            fs.writeFile(tmpXml, feed.xml, 'utf8'),
            fs.writeFile(
                tmpMeta,
                JSON.stringify(
                    {
                        etag: feed.etag,
                        builtAtMs: feed.builtAtMs,
                        lastModified: feed.lastModified ? feed.lastModified.toISOString() : null,
                        itemCount: feed.itemCount,
                    },
                    null,
                    2,
                ),
                'utf8',
            ),
        ]);
        await fs.rename(tmpXml, xmlPath);
        await fs.rename(tmpMeta, metaPath);
    }

    async function readFeedFromDisk(): Promise<CachedFeed | null> {
        try {
            const [xml, metaRaw] = await Promise.all([
                fs.readFile(xmlPath, 'utf8'),
                fs.readFile(metaPath, 'utf8'),
            ]);
            const meta = JSON.parse(metaRaw) as {
                etag?: string;
                builtAtMs?: number;
                lastModified?: string | null;
                itemCount?: number;
                episodeCount?: number;
            };
            if (!meta.etag || !meta.builtAtMs) return null;
            return {
                xml,
                etag: meta.etag,
                builtAtMs: meta.builtAtMs,
                lastModified: meta.lastModified ? new Date(meta.lastModified) : null,
                itemCount: meta.itemCount ?? meta.episodeCount ?? 0,
            };
        } catch {
            return null;
        }
    }

    async function refresh(): Promise<CachedFeed> {
        if (inflight) return inflight;

        inflight = (async () => {
            const startedAt = Date.now();
            const memStart = process.memoryUsage();
            const built = await spec.build();
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
                itemCount: built.itemCount,
            };
            cachedFeed = next;
            await writeFeedToDisk(next);
            inflight = null;

            spec.onBuildSuccess?.({durationMs, built, memoryUsedMB, memoryDeltaMB});

            if (durationMs >= 500) {
                recordDiagnosticEvent({
                    ts: Date.now(),
                    kind: 'route',
                    name: `feed.${spec.feedKey}.build`,
                    ok: true,
                    durationMs,
                    detail: {items: built.itemCount, memoryUsedMB, memoryDeltaMB},
                });
            }

            return next;
        })().catch((err) => {
            inflight = null;
            throw err;
        });

        return inflight;
    }

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
                await refresh();
            } catch {
                // ignore
            }
        })();
    }

    function ensureScheduler() {
        if (schedulerStarted) return;
        schedulerStarted = true;
        schedulerStartedAtMs = Date.now();
        void refresh().catch(() => undefined);
        schedulerTimer = setInterval(() => {
            void refresh().catch(() => undefined);
        }, FEED_REGENERATE_MS);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (schedulerTimer as any).unref?.();
    }

    function stopScheduler() {
        if (schedulerTimer) {
            clearInterval(schedulerTimer);
            schedulerTimer = null;
        }
        if (invalidationTimer) {
            clearTimeout(invalidationTimer);
            invalidationTimer = null;
        }
        schedulerStarted = false;
        schedulerStartedAtMs = null;
    }

    function scheduleDebouncedRefresh() {
        if (invalidationTimer) clearTimeout(invalidationTimer);
        invalidationTimer = setTimeout(() => {
            invalidationTimer = null;
            void refresh().catch(() => undefined);
        }, INVALIDATION_DEBOUNCE_MS);
    }

    function getSchedulerState() {
        return {
            schedulerStarted,
            hasTimer: schedulerTimer !== null,
            schedulerStartedAtMs,
        };
    }

    function reset() {
        cachedFeed = null;
        inflight = null;
        stopScheduler();
        ensureScheduler();
    }

    async function handle(request: Request): Promise<Response> {
        ensureWarmup();
        ensureScheduler();

        const ip = getClientIp(request);
        const rl = checkRateLimit(`feed:${spec.feedKey}:${ip}`, RATE_LIMIT);
        if (!rl.ok) {
            const fallback = fallbackFeedXml({
                title: spec.fallback.title,
                link: SITE_URL,
                selfLink,
                description: 'Rate limited. Please try again shortly.',
            });
            const headers = buildRssHeaders({cacheControl: 'no-store'});
            headers.set('Retry-After', String(rl.retryAfterSeconds));
            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'route',
                name: `feed.${spec.feedKey}.rate_limit`,
                ok: false,
                durationMs: 0,
                detail: {retryAfterSeconds: rl.retryAfterSeconds},
            });
            return new Response(fallback, {status: 429, headers});
        }

        try {
            // Cache-first serving: serve whatever's persisted regardless of age. The background
            // scheduler is the only refresh path under normal operation. The request path only
            // builds on cold start (no memory, no disk) — preventing synchronous rebuilds from
            // piling up under load. Invalidations trigger a debounced background refresh via
            // scheduleDebouncedRefresh().
            let feed: CachedFeed | null = cachedFeed;
            if (!feed) {
                feed = await readFeedFromDisk();
                if (feed) cachedFeed = feed;
            }
            if (!feed) {
                feed = await refresh();
            }

            const headers = buildRssHeaders({
                etag: feed.etag,
                lastModified: feed.lastModified,
                cacheControl:
                    'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, must-revalidate',
            });
            const maybe304 = maybeReturn304(request, feed.etag, headers);
            if (maybe304) return maybe304;

            return new Response(feed.xml, {headers});
        } catch (err) {
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
                title: spec.fallback.title,
                link: SITE_URL,
                selfLink,
                description: 'Feed temporarily unavailable',
            });

            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'route',
                name: `feed.${spec.feedKey}.serve`,
                ok: false,
                durationMs: 0,
                detail:
                    err instanceof Error
                        ? {errorName: err.name, errorMessage: err.message}
                        : {errorName: 'UnknownError'},
            });

            return new Response(fallback, {
                status: 503,
                headers: buildRssHeaders({cacheControl: 'no-store'}),
            });
        }
    }

    return {
        handle,
        refresh,
        scheduleDebouncedRefresh,
        stopScheduler,
        getSchedulerState,
        reset,
    };
}
