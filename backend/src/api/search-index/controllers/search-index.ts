/**
 * search-index controller
 */

import {factories} from '@strapi/strapi';
import {getHistoricalSearchIndexMetrics, getLastSearchIndexMetrics} from '../../../services/searchIndexBuilder';
import {checkRateLimit, getClientIp, verifySecret} from '../../../utils/requestSecurity';

export default factories.createCoreController('api::search-index.search-index', () => ({
    async metrics(ctx) {
        // Rate-limit before any token handling so unauthenticated floods and
        // token-guessing attempts consume the same budget as authenticated calls.
        const ip = getClientIp(ctx);
        const rl = checkRateLimit(`search-index-metrics:${ip}`);
        if (!rl.ok) {
            ctx.status = 429;
            ctx.set('Retry-After', String(rl.retryAfterSeconds));
            ctx.body = 'Too Many Requests';
            return;
        }

        const expected = process.env.DIAGNOSTICS_TOKEN ?? null;
        // Accept the token only via a header: query strings end up in access logs,
        // browser history, and Referer headers, and GET responses may be cached by
        // intermediaries.
        const provided = ctx?.request?.headers?.['x-m10z-diagnostics-token'];

        if (!verifySecret(provided, expected)) {
            ctx.status = 401;
            ctx.body = 'Unauthorized';
            return;
        }

        // Metrics history query parameters:
        // - limit: optional integer (default 30, capped at 1000, invalid values ignored)
        // - from / to: optional ISO date strings used as inclusive bounds on metrics.updatedAt
        // Normalization lives in getHistoricalSearchIndexMetrics; the controller only
        // parses what it can and forwards it.
        const rawLimit = (ctx?.request?.query?.limit ?? ctx?.query?.limit) as unknown;
        const rawFrom = (ctx?.request?.query?.from ?? ctx?.query?.from) as unknown;
        const rawTo = (ctx?.request?.query?.to ?? ctx?.query?.to) as unknown;

        const limit = Number(rawLimit);
        const from = typeof rawFrom === 'string' ? rawFrom : undefined;
        const to = typeof rawTo === 'string' ? rawTo : undefined;

        const history = getHistoricalSearchIndexMetrics(limit, from, to);

        // Response format:
        // {
        //   now: number (ms since epoch),
        //   metrics: SearchIndexMetricsSnapshot | null, // latest snapshot for backward compatibility
        //   history: SearchIndexMetricsHistoryEntry[]   // most-recent-first historical entries
        // }
        ctx.set('Cache-Control', 'no-store');
        ctx.body = {
            now: Date.now(),
            metrics: getLastSearchIndexMetrics(),
            history,
        };
    },
}));
