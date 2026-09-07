/**
 * Minimal Umami API client (username/password auth) for the umami-stats plugin.
 *
 * - POST /api/auth/login gives a bearer token, cached in memory and renewed
 *   on 401 (single transparent retry per request).
 * - The aggregated dashboard payload is cached for CACHE_TTL_MS and shared
 *   between concurrent callers via in-flight deduplication, so opening the
 *   admin dashboard never fans out into Umami request storms.
 *
 * Secrets are never logged. All failures surface as coded errors from
 * ./umami so the controller can map them to HTTP statuses.
 */
'use strict';

const {
    CACHE_TTL_MS,
    TOP_SLUGS_LIMIT,
    buildEventValuesUrl,
    buildStatsUrl,
    createAuthError,
    createUpstreamError,
    getRangeBounds,
    normalizeCount,
    sumEventTotals,
    toTopSlugs,
} = require('./umami');

const LOGIN_TIMEOUT_MS = 10_000;
const STATS_TIMEOUT_MS = 15_000;

/**
 * @param {{fetchImpl?: typeof fetch, now?: () => number, log?: {debug: (...args: Array<unknown>) => void, info: (...args: Array<unknown>) => void, warn: (...args: Array<unknown>) => void, error: (...args: Array<unknown>) => void}}} deps
 *   injectable fetch/clock/logger (defaults target production; tests inject fakes)
 */
function createUmamiClient({fetchImpl, now, log} = {}) {
    const fetchFn = fetchImpl || ((...args) => globalThis.fetch(...args));
    const nowFn = now || Date.now;
    const logger = log || {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
    };

    /** @type {{token: string, at: number} | null} */
    let tokenCache = null;
    /** @type {Promise<string> | null} shared in-flight login */
    let loginInflight = null;
    /** @type {{at: number, payload: Record<string, unknown>} | null} */
    let payloadCache = null;
    /** @type {Promise<Record<string, unknown>> | null} shared in-flight request */
    let inflight = null;

    /**
     * JSON request with timeout. Never throws raw network errors; everything
     * becomes a coded Umami error. The URL may be logged (it carries no
     * secrets); headers and bodies never are.
     */
    async function requestJson(url, {method, headers, body, timeoutMs}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetchFn(url, {method, headers, body, signal: controller.signal});
            if (response.status === 401) {
                return {unauthorized: true, data: null};
            }
            if (!response.ok) {
                throw createUpstreamError(response.status);
            }
            const data = await response.json();
            if (data === null || data === undefined) {
                throw createUpstreamError(response.status);
            }
            return {unauthorized: false, data};
        } catch (error) {
            if (error && (error.code === 'UMAMI_AUTH' || error.code === 'UMAMI_UPSTREAM')) {
                throw error;
            }
            const reason = error && error.name === 'AbortError' ? 'timeout' : 'network error';
            logger.warn(`[umami-stats] Umami request failed (${reason}): ${url}`);
            throw createUpstreamError(0);
        } finally {
            clearTimeout(timeout);
        }
    }

    async function login(config) {
        logger.debug('[umami-stats] Authenticating with the Umami API.');
        const {data, unauthorized} = await requestJson(`${config.host}/api/auth/login`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({username: config.username, password: config.password}),
            timeoutMs: LOGIN_TIMEOUT_MS,
        });
        if (unauthorized) {
            logger.warn('[umami-stats] Umami rejected the configured credentials.');
            throw createAuthError();
        }
        const token = data && typeof data.token === 'string' && data.token.length > 0 ? data.token : null;
        if (!token) {
            logger.warn('[umami-stats] Umami login response did not contain a token.');
            throw createUpstreamError(0);
        }
        tokenCache = {token, at: nowFn()};
        return token;
    }

    /**
     * Cached token, deduplicating concurrent logins (all three ranges start
     * in parallel on a cold cache).
     */
    async function getToken(config) {
        if (tokenCache) return tokenCache.token;
        if (!loginInflight) {
            loginInflight = login(config).finally(() => {
                loginInflight = null;
            });
        }
        return loginInflight;
    }

    async function authorizedGet(config, url) {
        const attempt = (token) =>
            requestJson(url, {
                method: 'GET',
                headers: {authorization: `Bearer ${token}`},
                timeoutMs: STATS_TIMEOUT_MS,
            });
        let result = await attempt(await getToken(config));
        if (result.unauthorized) {
            tokenCache = null;
            result = await attempt(await getToken(config));
            if (result.unauthorized) {
                throw createAuthError();
            }
        }
        return result.data;
    }

    async function fetchDashboard(config) {
        const nowMs = nowFn();
        const bounds = getRangeBounds(nowMs);
        const entries = await Promise.all(
            Object.entries(bounds).map(async ([key, {startAt, endAt}]) => {
                const [stats, values] = await Promise.all([
                    authorizedGet(config, buildStatsUrl(config, startAt, endAt)),
                    authorizedGet(config, buildEventValuesUrl(config, startAt, endAt)),
                ]);
                return [key, {startAt, endAt, stats, values}];
            }),
        );
        /** @type {Record<string, {startAt: string, endAt: string, pageviews: number, visitors: number, visits: number, podcastDownloads: number}>} */
        const ranges = {};
        /** @type {Record<string, Array<{slug: string, downloads: number}>>} */
        const topSlugs = {};
        for (const [key, {startAt, endAt, stats, values}] of entries) {
            const safeStats = stats && typeof stats === 'object' ? stats : {};
            ranges[key] = {
                startAt: new Date(startAt).toISOString(),
                endAt: new Date(endAt).toISOString(),
                pageviews: normalizeCount(safeStats.pageviews),
                visitors: normalizeCount(safeStats.visitors),
                visits: normalizeCount(safeStats.visits),
                podcastDownloads: sumEventTotals(values),
            };
            topSlugs[key] = toTopSlugs(values, TOP_SLUGS_LIMIT);
        }
        return {
            ranges,
            topSlugs,
            cachedAt: new Date(nowMs).toISOString(),
            cacheTtlSeconds: Math.round(CACHE_TTL_MS / 1000),
        };
    }

    /**
     * Load the aggregated dashboard payload, served from cache when fresh.
     *
     * @param {{host: string, username: string, password: string, websiteId: string}} config validated config
     */
    async function getDashboard(config) {
        const nowMs = nowFn();
        if (payloadCache && nowMs - payloadCache.at < CACHE_TTL_MS) {
            return {...payloadCache.payload, cacheHit: true};
        }
        if (!inflight) {
            inflight = fetchDashboard(config)
                .then((payload) => {
                    payloadCache = {at: nowFn(), payload};
                    return {...payload, cacheHit: false};
                })
                .finally(() => {
                    inflight = null;
                });
        }
        return inflight;
    }

    return {getDashboard};
}

module.exports = {createUmamiClient};
