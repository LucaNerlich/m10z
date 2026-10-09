/**
 * Minimal Umami API client for the public Statistik page.
 *
 * - POST /api/auth/login → bearer token (in-memory, renewed on 401)
 * - GET /api/websites/:id/stats → pageviews, visitors, visits for public ranges
 *
 * Import only from server modules (`umamiStatsSource` gates with `server-only`).
 * Fetches use `cache: 'no-store'`; TTL lives in the outer `unstable_cache`.
 * Secrets are never logged. Failures throw coded errors so the soft-fail
 * source can return null without leaking credentials.
 */

import {
    type UmamiStatsConfig,
    type UmamiTrafficStats,
    buildArticleStatsUrl,
    buildEventValuesUrl,
    buildLoginUrl,
    buildStatsUrl,
    getPublicRangeBounds,
    parseStatsPayload,
    sumEventTotals,
    toTopPodcastDownloads,
} from '@/src/lib/analytics/umamiStats';
import {CACHE_REVALIDATE_UMAMI} from '@/src/lib/cache/constants';

const LOGIN_TIMEOUT_MS = 10_000;
const STATS_TIMEOUT_MS = 15_000;

export type UmamiClientErrorCode = 'UMAMI_AUTH' | 'UMAMI_UPSTREAM';

export class UmamiClientError extends Error {
    readonly code: UmamiClientErrorCode;
    readonly upstreamStatus: number;

    constructor(code: UmamiClientErrorCode, message: string, upstreamStatus = 0) {
        super(message);
        this.name = 'UmamiClientError';
        this.code = code;
        this.upstreamStatus = upstreamStatus;
    }
}

type FetchImpl = typeof fetch;

type ClientDeps = {
    fetchImpl?: FetchImpl;
    now?: () => number;
    log?: {warn: (...args: unknown[]) => void};
};

type JsonResult = {unauthorized: true; data: null} | {unauthorized: false; data: unknown};

/**
 * Create an injectable Umami stats client (tests pass fakes for fetch/clock).
 */
export function createUmamiStatsClient({fetchImpl, now, log}: ClientDeps = {}) {
    const fetchFn: FetchImpl = fetchImpl ?? ((...args) => globalThis.fetch(...args));
    const nowFn = now ?? Date.now;
    const logger = log ?? {warn: () => {}};

    /** Bearer token; cleared on 401 (no age-based expiry — Umami renews via retry). */
    let tokenCache: string | null = null;
    let loginInflight: Promise<string> | null = null;

    async function requestJson(
        url: string,
        options: {
            method: string;
            headers?: Record<string, string>;
            body?: string;
            timeoutMs: number;
        }
    ): Promise<JsonResult> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
        try {
            const init: RequestInit = {
                method: options.method,
                headers: options.headers,
                body: options.body,
                redirect: 'error',
                signal: controller.signal,
                cache: 'no-store',
            };

            const response = await fetchFn(url, init);
            if (response.status === 401) {
                return {unauthorized: true, data: null};
            }
            if (!response.ok) {
                throw new UmamiClientError(
                    'UMAMI_UPSTREAM',
                    `Umami API responded with status ${response.status}.`,
                    response.status
                );
            }
            const data = await response.json();
            if (data === null || data === undefined) {
                throw new UmamiClientError('UMAMI_UPSTREAM', 'Umami API returned an empty body.', response.status);
            }
            return {unauthorized: false, data};
        } catch (error) {
            if (error instanceof UmamiClientError) throw error;
            const reason = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network error';
            // URL only — never headers/body (credentials live there).
            logger.warn(`[umami-stats] Umami request failed (${reason}): ${url}`);
            throw new UmamiClientError('UMAMI_UPSTREAM', 'Umami API is unreachable.');
        } finally {
            clearTimeout(timeout);
        }
    }

    async function login(config: UmamiStatsConfig): Promise<string> {
        const {data, unauthorized} = await requestJson(buildLoginUrl(config), {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({username: config.username, password: config.password}),
            timeoutMs: LOGIN_TIMEOUT_MS,
        });
        if (unauthorized) {
            logger.warn('[umami-stats] Umami rejected the configured credentials.');
            throw new UmamiClientError('UMAMI_AUTH', 'Umami authentication failed.');
        }
        const token =
            data && typeof data === 'object' && typeof (data as {token?: unknown}).token === 'string'
                ? (data as {token: string}).token
                : null;
        if (!token || token.length === 0) {
            logger.warn('[umami-stats] Umami login response did not contain a token.');
            throw new UmamiClientError('UMAMI_UPSTREAM', 'Umami login response did not contain a token.');
        }
        tokenCache = token;
        return token;
    }

    async function getToken(config: UmamiStatsConfig): Promise<string> {
        if (tokenCache) return tokenCache;
        if (!loginInflight) {
            loginInflight = login(config).finally(() => {
                loginInflight = null;
            });
        }
        return loginInflight;
    }

    async function authorizedGet(config: UmamiStatsConfig, url: string): Promise<unknown> {
        const attempt = (token: string) =>
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
                throw new UmamiClientError('UMAMI_AUTH', 'Umami authentication failed.');
            }
        }
        return result.data;
    }

    /**
     * Site-wide stats plus article pageviews and podcast-download events (30 days).
     */
    async function getTrafficStats(config: UmamiStatsConfig): Promise<UmamiTrafficStats> {
        const nowMs = nowFn();
        const {startAt, endAt} = getPublicRangeBounds(nowMs)['30d'];
        const [raw, articleRaw, eventRows] = await Promise.all([
            authorizedGet(config, buildStatsUrl(config, startAt, endAt)),
            authorizedGet(config, buildArticleStatsUrl(config, startAt, endAt)),
            authorizedGet(config, buildEventValuesUrl(config, startAt, endAt)),
        ]);

        return {
            ranges: {
                '30d': {
                    startAt: new Date(startAt).toISOString(),
                    endAt: new Date(endAt).toISOString(),
                    ...parseStatsPayload(raw),
                },
            },
            content: {
                articles: parseStatsPayload(articleRaw),
                podcasts: {
                    downloads: sumEventTotals(eventRows),
                    topEpisodes: toTopPodcastDownloads(eventRows),
                },
            },
            cachedAt: new Date(nowMs).toISOString(),
            cacheTtlSeconds: CACHE_REVALIDATE_UMAMI,
        };
    }

    return {getTrafficStats};
}
