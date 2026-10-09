/**
 * Pure helpers for reading Umami website stats (no network, no Next imports).
 *
 * Public Statistik uses:
 * - GET /api/websites/:id/stats — site-wide and article pageviews (`path` contains `/artikel`)
 * - GET /api/websites/:id/event-data/values — podcast-download custom events
 */

import {validateSlugSafe} from '@/src/lib/security/slugValidation';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Public Statistik ranges: last 30 days is the primary display window. */
export const UMAMI_PUBLIC_RANGE_KEYS = ['30d'] as const;

/** Umami contains-operator filter (`c.`) so `/artikel` and `/artikel/:slug` both count. */
export const ARTICLE_PATH_FILTER = 'c./artikel';

/** Umami event type for pageviews (excludes custom events on the same path). */
export const PAGEVIEW_EVENT_TYPE = '1';

/** Custom event recorded for podcast downloads (see `umamiServer.ts`). */
export const PODCAST_DOWNLOAD_EVENT = 'podcast-download';

/** Event-data property holding the episode slug. */
export const SLUG_PROPERTY = 'slug';

/** How many top episodes the podcast panel lists. */
export const PODCAST_TOP_LIMIT = 5;

export type UmamiPublicRangeKey = (typeof UMAMI_PUBLIC_RANGE_KEYS)[number];

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

export type UmamiPodcastDownload = {
    slug: string;
    downloads: number;
};

export type UmamiContentStats = {
    articles: {
        pageviews: number;
        visitors: number;
        visits: number;
    };
    podcasts: {
        downloads: number;
        topEpisodes: UmamiPodcastDownload[];
    };
};

export type UmamiTrafficStats = {
    ranges: Record<UmamiPublicRangeKey, UmamiRangeStats>;
    content: UmamiContentStats;
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

/** Stats filtered to article pageviews (`/artikel` and `/artikel/:slug`). */
export function buildArticleStatsUrl(
    config: Pick<UmamiStatsConfig, 'host' | 'websiteId'>,
    startAt: number,
    endAt: number
): string {
    return buildStatsUrl(config, startAt, endAt, {
        path: ARTICLE_PATH_FILTER,
        eventType: PAGEVIEW_EVENT_TYPE,
    });
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
 * Sum podcast-download totals. Only rows with a valid episode slug count.
 */
export function sumEventTotals(rows: unknown): number {
    if (!Array.isArray(rows)) return 0;
    return rows.reduce((sum, row) => {
        if (!row || typeof row !== 'object') return sum;
        const value = (row as {value?: unknown}).value;
        const slug = typeof value === 'string' ? validateSlugSafe(value) : null;
        if (!slug) return sum;
        return sum + normalizeCount((row as {total?: unknown}).total);
    }, 0);
}

/**
 * Top podcast episodes by download count.
 */
export function toTopPodcastDownloads(rows: unknown, limit = PODCAST_TOP_LIMIT): UmamiPodcastDownload[] {
    const max = typeof limit === 'number' && limit > 0 ? Math.floor(limit) : PODCAST_TOP_LIMIT;
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
