/**
 * Pure helpers for reading Umami website stats (no network, no Next imports).
 *
 * Public Statistik uses:
 * - GET /api/websites/:id/stats — site-wide reach
 * - GET /api/websites/:id/metrics?type=path — per-article pageviews (`path` contains `/artikel`)
 * - GET /api/websites/:id/event-data/values — podcast-download custom events
 */

import {validateSlugSafe} from '@/src/lib/security/slugValidation';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Public Statistik ranges: last 30 days is the primary display window. */
export const UMAMI_PUBLIC_RANGE_KEYS = ['30d'] as const;

/**
 * Detail page (`/statistik/reichweite`) time windows.
 * Queried via `?zeitraum=` — default is `30d`.
 */
export const UMAMI_DETAIL_RANGE_KEYS = ['7d', '30d', '6m'] as const;

export type UmamiPublicRangeKey = (typeof UMAMI_PUBLIC_RANGE_KEYS)[number];

export type UmamiDetailRangeKey = (typeof UMAMI_DETAIL_RANGE_KEYS)[number];

/** German labels for detail range keys (UI + query param docs). */
export const UMAMI_DETAIL_RANGE_LABELS: Record<UmamiDetailRangeKey, string> = {
    '7d': '7 Tage',
    '30d': '30 Tage',
    '6m': '6 Monate',
};

/** Umami contains-operator filter (`c.`) so `/artikel` and `/artikel/:slug` both count. */
export const ARTICLE_PATH_FILTER = 'c./artikel';

/** Umami event type for pageviews (excludes custom events on the same path). */
export const PAGEVIEW_EVENT_TYPE = '1';

/** Custom event recorded for podcast downloads (see `umamiServer.ts`). */
export const PODCAST_DOWNLOAD_EVENT = 'podcast-download';

/** Event-data property holding the episode slug. */
export const SLUG_PROPERTY = 'slug';

/** How many top articles / episodes the content panels list. */
export const CONTENT_TOP_LIMIT = 10;

/** How many articles / episodes the detail page lists per range. */
export const CONTENT_DETAIL_LIMIT = 50;

/** How many path rows to request before filtering to `/artikel/:slug`. */
export const ARTICLE_METRICS_FETCH_LIMIT = 40;

/** Larger path pull for the detail page (before slug filtering). */
export const ARTICLE_METRICS_DETAIL_FETCH_LIMIT = 200;

export type UmamiStatsConfig = {
    host: string;
    username: string;
    password: string;
    websiteId: string;
};

export type UmamiRangeStats = {
    startAt: string;
    endAt: string;
    pageviews: number;
    visitors: number;
    visits: number;
};

export type UmamiArticlePageview = {
    slug: string;
    pageviews: number;
};

export type UmamiPodcastDownload = {
    slug: string;
    downloads: number;
};

export type UmamiContentStats = {
    articles: {
        topArticles: UmamiArticlePageview[];
    };
    podcasts: {
        topEpisodes: UmamiPodcastDownload[];
    };
};

export type UmamiTrafficStats = {
    ranges: Record<UmamiPublicRangeKey, UmamiRangeStats>;
    content: UmamiContentStats;
    cachedAt: string;
    cacheTtlSeconds: number;
};

/** One detail-page window: site totals plus long article/podcast rankings. */
export type UmamiReachDetailRange = UmamiRangeStats & {
    articles: UmamiArticlePageview[];
    podcasts: UmamiPodcastDownload[];
};

export type UmamiReachDetailStats = {
    ranges: Record<UmamiDetailRangeKey, UmamiReachDetailRange>;
    cachedAt: string;
    cacheTtlSeconds: number;
};

/**
 * Compute `{startAt, endAt}` timestamps (ms) for every public range.
 *
 * @param nowMs reference timestamp (injectable for tests)
 */
export function getPublicRangeBounds(nowMs: number): Record<UmamiPublicRangeKey, {startAt: number; endAt: number}> {
    return {
        '30d': {startAt: nowMs - 30 * DAY_MS, endAt: nowMs},
    };
}

/**
 * Compute `{startAt, endAt}` for the detail page windows (7d / 30d / ~6 months).
 *
 * @param nowMs reference timestamp (injectable for tests)
 */
export function getDetailRangeBounds(nowMs: number): Record<UmamiDetailRangeKey, {startAt: number; endAt: number}> {
    return {
        '7d': {startAt: nowMs - 7 * DAY_MS, endAt: nowMs},
        '30d': {startAt: nowMs - 30 * DAY_MS, endAt: nowMs},
        // 183 days ≈ half a year including leap-year mid-years.
        '6m': {startAt: nowMs - 183 * DAY_MS, endAt: nowMs},
    };
}

/** Parse `?zeitraum=` into a known detail range; unknown values fall back to 30 days. */
export function parseDetailRangeKey(raw: string | null | undefined): UmamiDetailRangeKey {
    if (raw === '7d' || raw === '30d' || raw === '6m') return raw;
    return '30d';
}

/**
 * Normalize the configured Umami host to an HTTPS origin.
 * Rejects HTTP, non-root paths, query/hash, and non-strings (SSRF hardening).
 */
export function normalizeUmamiHost(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value.trim());
        if (url.protocol !== 'https:' || !/^\/+$/u.test(url.pathname) || url.search || url.hash) {
            return null;
        }
        return url.origin;
    } catch {
        return null;
    }
}

/**
 * Accept a website UUID (or opaque id) used in `/api/websites/:id/...` paths.
 * Rejects empty strings and characters that would break path encoding unexpectedly.
 */
export function normalizeWebsiteId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > 128) return null;
    // Allow UUID and typical Umami ids; block path separators and whitespace.
    if (!/^[A-Za-z0-9_-]+$/u.test(trimmed)) return null;
    return trimmed;
}

/**
 * Read and validate server-only Umami credentials from environment variables.
 * Website id prefers `UMAMI_WEBSITE_ID`, then falls back to the public tracking id.
 * Only key names (never secret values) are reported as missing.
 */
export function readUmamiStatsConfig(
    env: Record<string, string | undefined> = process.env
): {ok: true; value: UmamiStatsConfig} | {ok: false; missing: string[]} {
    const host = normalizeUmamiHost(env.UMAMI_HOST);
    const username = typeof env.UMAMI_USERNAME === 'string' ? env.UMAMI_USERNAME.trim() : '';
    const password =
        typeof env.UMAMI_PASSWORD === 'string' && env.UMAMI_PASSWORD.length > 0 ? env.UMAMI_PASSWORD : null;
    const websiteId =
        normalizeWebsiteId(env.UMAMI_WEBSITE_ID) ?? normalizeWebsiteId(env.NEXT_PUBLIC_UMAMI_WEBSITE_ID);

    const missing: string[] = [];
    if (!host) missing.push('UMAMI_HOST');
    if (!username) missing.push('UMAMI_USERNAME');
    if (!password) missing.push('UMAMI_PASSWORD');
    if (!websiteId) missing.push('UMAMI_WEBSITE_ID');
    if (missing.length > 0 || !host || !password || !websiteId) {
        return {ok: false, missing};
    }

    return {
        ok: true,
        value: {
            host,
            username,
            password,
            websiteId,
        },
    };
}

/** Build the authentication URL from the validated Umami origin. */
export function buildLoginUrl(config: Pick<UmamiStatsConfig, 'host'>): string {
    return new URL('/api/auth/login', config.host).toString();
}

/**
 * Build the website-stats URL for one range.
 * Optional filters use Umami's `operator.value` query form (e.g. `path=c./artikel`).
 */
export function buildStatsUrl(
    config: Pick<UmamiStatsConfig, 'host' | 'websiteId'>,
    startAt: number,
    endAt: number,
    filters?: Record<string, string>
): string {
    const url = new URL(`/api/websites/${encodeURIComponent(config.websiteId)}/stats`, config.host);
    url.searchParams.set('startAt', String(startAt));
    url.searchParams.set('endAt', String(endAt));
    if (filters) {
        for (const [key, value] of Object.entries(filters)) {
            url.searchParams.set(key, value);
        }
    }
    return url.toString();
}

/**
 * Ranked path metrics for article pages (`/artikel` and `/artikel/:slug`).
 */
export function buildArticleMetricsUrl(
    config: Pick<UmamiStatsConfig, 'host' | 'websiteId'>,
    startAt: number,
    endAt: number,
    limit = ARTICLE_METRICS_FETCH_LIMIT
): string {
    const url = new URL(`/api/websites/${encodeURIComponent(config.websiteId)}/metrics`, config.host);
    url.searchParams.set('startAt', String(startAt));
    url.searchParams.set('endAt', String(endAt));
    url.searchParams.set('type', 'path');
    url.searchParams.set('path', ARTICLE_PATH_FILTER);
    url.searchParams.set('eventType', PAGEVIEW_EVENT_TYPE);
    url.searchParams.set('limit', String(limit > 0 ? Math.floor(limit) : ARTICLE_METRICS_FETCH_LIMIT));
    return url.toString();
}

/**
 * Extract an article slug from an Umami path (`/artikel/:slug` only; list page ignored).
 */
export function articleSlugFromPath(path: unknown): string | null {
    if (typeof path !== 'string') return null;
    const pathname = path.trim().split(/[?#]/u)[0] ?? '';
    const match = pathname.match(/^\/artikel\/([^/]+)\/?$/u);
    if (!match) return null;
    return validateSlugSafe(match[1]);
}

/**
 * Per-slug podcast-download totals for one range.
 */
export function buildEventValuesUrl(
    config: Pick<UmamiStatsConfig, 'host' | 'websiteId'>,
    startAt: number,
    endAt: number
): string {
    const url = new URL(`/api/websites/${encodeURIComponent(config.websiteId)}/event-data/values`, config.host);
    url.searchParams.set('startAt', String(startAt));
    url.searchParams.set('endAt', String(endAt));
    url.searchParams.set('event', PODCAST_DOWNLOAD_EVENT);
    url.searchParams.set('propertyName', SLUG_PROPERTY);
    return url.toString();
}

/**
 * Coerce an Umami counter to a non-negative integer (garbage becomes 0).
 *
 * Accepts bare numbers/numeric strings and modern Umami metric objects
 * shaped like `{value: number, prev?: number}` (use `value` only).
 */
export function normalizeCount(value: unknown): number {
    const raw =
        value && typeof value === 'object' && 'value' in value
            ? (value as {value: unknown}).value
            : value;
    const num = typeof raw === 'string' && raw.trim().length > 0 ? Number(raw) : raw;
    if (typeof num !== 'number' || !Number.isFinite(num) || num < 0) return 0;
    return Math.floor(num);
}

/**
 * Parse a raw `/stats` JSON body into pageviews / visitors / visits.
 */
export function parseStatsPayload(raw: unknown): {pageviews: number; visitors: number; visits: number} {
    const safe = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    return {
        pageviews: normalizeCount(safe.pageviews),
        visitors: normalizeCount(safe.visitors),
        visits: normalizeCount(safe.visits),
    };
}

/**
 * Top articles by pageviews from `/metrics?type=path` rows (`{x: path, y: count}`).
 */
export function toTopArticlePageviews(rows: unknown, limit = CONTENT_TOP_LIMIT): UmamiArticlePageview[] {
    const max = typeof limit === 'number' && limit > 0 ? Math.floor(limit) : CONTENT_TOP_LIMIT;
    if (!Array.isArray(rows)) return [];
    return rows
        .flatMap((row) => {
            if (!row || typeof row !== 'object') return [];
            const slug = articleSlugFromPath((row as {x?: unknown}).x);
            if (!slug) return [];
            return [{slug, pageviews: normalizeCount((row as {y?: unknown}).y)}];
        })
        .sort((a, b) => b.pageviews - a.pageviews)
        .slice(0, max);
}

/**
 * Top podcast episodes by download count.
 */
export function toTopPodcastDownloads(rows: unknown, limit = CONTENT_TOP_LIMIT): UmamiPodcastDownload[] {
    const max = typeof limit === 'number' && limit > 0 ? Math.floor(limit) : CONTENT_TOP_LIMIT;
    if (!Array.isArray(rows)) return [];
    return rows
        .flatMap((row) => {
            if (!row || typeof row !== 'object') return [];
            const value = (row as {value?: unknown}).value;
            const slug = typeof value === 'string' ? validateSlugSafe(value) : null;
            if (!slug) return [];
            return [{slug, downloads: normalizeCount((row as {total?: unknown}).total)}];
        })
        .sort((a, b) => b.downloads - a.downloads)
        .slice(0, max);
}
