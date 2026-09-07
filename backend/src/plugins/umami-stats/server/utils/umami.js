/**
 * Pure helpers for the umami-stats plugin (no Strapi imports).
 *
 * Everything in this module is side-effect free so it can be unit-tested
 * without booting Strapi or reaching the network.
 *
 * Umami API mapping (self-hosted, username/password auth):
 * - website views  -> GET /api/websites/:websiteId/stats?startAt=&endAt=
 *                     ({pageviews, visitors, visits, ...})
 * - podcast downloads per episode
 *                   -> GET /api/websites/:websiteId/event-data/values
 *                      ?startAt=&endAt=&event=podcast-download&propertyName=slug
 *                      ([{value: <slug>, total: <count>}])
 *   The total per range is the sum over all returned slug rows.
 */
'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ranges shown in the widget: 7 days, 30 days, 6 calendar months. */
const RANGE_KEYS = ['7d', '30d', '6m'];

/** Custom Umami event recorded for podcast downloads (see frontend `umamiServer.ts`). */
const PODCAST_DOWNLOAD_EVENT = 'podcast-download';

/** Event-data property holding the episode slug. */
const SLUG_PROPERTY = 'slug';

/** How many top episodes per range the widget displays. */
const TOP_SLUGS_LIMIT = 10;

/** Server-side cache TTL for the aggregated dashboard payload. */
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Compute `{startAt, endAt}` timestamps (ms) for every widget range.
 * `7d`/`30d` go back exact days, `6m` goes back 6 calendar months.
 *
 * @param {number} nowMs reference timestamp (injectable for tests)
 * @returns {Record<string, {startAt: number, endAt: number}>}
 */
function getRangeBounds(nowMs) {
    const sixMonthsAgo = new Date(nowMs);
    sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
    return {
        '7d': {startAt: nowMs - 7 * DAY_MS, endAt: nowMs},
        '30d': {startAt: nowMs - 30 * DAY_MS, endAt: nowMs},
        '6m': {startAt: sixMonthsAgo.getTime(), endAt: nowMs},
    };
}

/**
 * Normalize the configured Umami host (strip whitespace/trailing slashes).
 *
 * @param {unknown} value raw `UMAMI_HOST` value
 * @returns {string | null} normalized host or null when missing/invalid
 */
function normalizeHost(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(trimmed)) return null;
    try {
        const url = new URL(trimmed);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        return trimmed;
    } catch {
        return null;
    }
}

/**
 * Read and validate the plugin configuration from environment variables.
 * Only key names (never secret values) are reported as missing.
 *
 * @param {Record<string, string | undefined>} env e.g. `process.env`
 * @returns {{ok: true, value: {host: string, username: string, password: string, websiteId: string}} | {ok: false, missing: Array<string>}}
 */
function readUmamiConfig(env) {
    const source = env || {};
    const host = normalizeHost(source.UMAMI_HOST);
    const username = typeof source.UMAMI_USERNAME === 'string' ? source.UMAMI_USERNAME.trim() : '';
    const password = typeof source.UMAMI_PASSWORD === 'string' && source.UMAMI_PASSWORD.length > 0 ? source.UMAMI_PASSWORD : null;
    const websiteId = typeof source.UMAMI_WEBSITE_ID === 'string' ? source.UMAMI_WEBSITE_ID.trim() : '';
    const missing = [];
    if (!host) missing.push('UMAMI_HOST');
    if (!username) missing.push('UMAMI_USERNAME');
    if (!password) missing.push('UMAMI_PASSWORD');
    if (!websiteId) missing.push('UMAMI_WEBSITE_ID');
    if (missing.length > 0) return {ok: false, missing};
    return {ok: true, value: {host, username, password, websiteId}};
}

/**
 * Build the website-stats URL for one range.
 *
 * @param {{host: string, websiteId: string}} config validated config
 */
function buildStatsUrl(config, startAt, endAt) {
    const url = new URL(`/api/websites/${encodeURIComponent(config.websiteId)}/stats`, config.host);
    url.searchParams.set('startAt', String(startAt));
    url.searchParams.set('endAt', String(endAt));
    return url.toString();
}

/**
 * Build the per-slug podcast-download URL for one range.
 *
 * @param {{host: string, websiteId: string}} config validated config
 */
function buildEventValuesUrl(config, startAt, endAt) {
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
 * @param {unknown} value raw counter value
 */
function normalizeCount(value) {
    const num = typeof value === 'string' && value.trim().length > 0 ? Number(value) : value;
    if (typeof num !== 'number' || !Number.isFinite(num) || num < 0) return 0;
    return Math.floor(num);
}

/**
 * Turn raw event-data value rows into a sorted, limited top-slug list.
 *
 * @param {unknown} rows raw `/event-data/values` response
 * @param {number} [limit] max entries (defaults to TOP_SLUGS_LIMIT)
 * @returns {Array<{slug: string, downloads: number}>}
 */
function toTopSlugs(rows, limit) {
    const max = typeof limit === 'number' && limit > 0 ? Math.floor(limit) : TOP_SLUGS_LIMIT;
    if (!Array.isArray(rows)) return [];
    return rows
        .filter((row) => row && typeof row.value === 'string' && row.value.trim().length > 0)
        .map((row) => ({slug: row.value.trim(), downloads: normalizeCount(row.total)}))
        .sort((a, b) => b.downloads - a.downloads)
        .slice(0, max);
}

/**
 * Sum all per-slug totals into the range total.
 *
 * Only rows with a valid slug value count, mirroring `toTopSlugs`, so the
 * total always matches the breakdown shown in the widget.
 *
 * @param {unknown} rows raw `/event-data/values` response
 */
function sumEventTotals(rows) {
    if (!Array.isArray(rows)) return 0;
    return rows
        .filter((row) => row && typeof row.value === 'string' && row.value.trim().length > 0)
        .reduce((sum, row) => sum + normalizeCount(row.total), 0);
}

/**
 * Create the error thrown when required env vars are missing.
 * The controller maps it to HTTP 503.
 */
function createConfigError(missing) {
    const error = new Error(`Umami statistics are not configured (missing: ${missing.join(', ')}).`);
    error.code = 'UMAMI_CONFIG';
    error.status = 503;
    return error;
}

/** Create the error thrown when Umami rejects the credentials (controller maps it to HTTP 502). */
function createAuthError() {
    const error = new Error('Umami authentication failed. Check UMAMI_USERNAME/UMAMI_PASSWORD.');
    error.code = 'UMAMI_AUTH';
    error.status = 502;
    return error;
}

/**
 * Create the error thrown when Umami is unreachable or answers unexpectedly
 * (controller maps it to HTTP 502).
 *
 * @param {number} status upstream HTTP status, 0 for network/timeout failures
 */
function createUpstreamError(status) {
    const error = new Error(status > 0 ? `Umami API responded with status ${status}.` : 'Umami API is unreachable.');
    error.code = 'UMAMI_UPSTREAM';
    error.status = 502;
    error.upstreamStatus = status;
    return error;
}

module.exports = {
    CACHE_TTL_MS,
    PODCAST_DOWNLOAD_EVENT,
    RANGE_KEYS,
    SLUG_PROPERTY,
    TOP_SLUGS_LIMIT,
    buildEventValuesUrl,
    buildStatsUrl,
    createAuthError,
    createConfigError,
    createUpstreamError,
    getRangeBounds,
    normalizeCount,
    normalizeHost,
    readUmamiConfig,
    sumEventTotals,
    toTopSlugs,
};
