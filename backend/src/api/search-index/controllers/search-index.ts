/**
 * search-index controller
 */

import {factories} from '@strapi/strapi';
import {getHistoricalSearchIndexMetrics, getLastSearchIndexMetrics} from '../../../services/searchIndexBuilder';
import {checkRateLimit, getClientIp, verifySecret} from '../../../utils/requestSecurity';

export default factories.createCoreController('api::search-index.search-index', () => ({
    async metrics(ctx) {
        const expected = process.env.DIAGNOSTICS_TOKEN ?? null;
        const provided =
            ctx?.request?.query?.token ??
            ctx?.query?.token ??
            ctx?.request?.headers?.['x-m10z-diagnostics-token'];

        if (!verifySecret(provided, expected)) {
            ctx.status = 401;
            ctx.body = 'Unauthorized';
            return;
        }

        const ip = getClientIp(ctx);
        const rl = checkRateLimit(`search-index-metrics:${ip}`);
        if (!rl.ok) {
            ctx.status = 429;
            ctx.set('Retry-After', String(rl.retryAfterSeconds));
            ctx.body = 'Too Many Requests';
            return;
        }

        // Metrics history query parameters:
        // - limit: optional integer, default 30, max 1000
        // - from / to: optional ISO date strings used as inclusive bounds on metrics.updatedAt
        const rawLimit = (ctx?.request?.query?.limit ?? ctx?.query?.limit) as unknown;
        let limit = 30;
        if (typeof rawLimit === 'string' || typeof rawLimit === 'number') {
            const parsed = Number(rawLimit);
            if (Number.isFinite(parsed) && parsed > 0) {
                limit = Math.min(parsed, 1000);
            }
        }

        const rawFrom = (ctx?.request?.query?.from ?? ctx?.query?.from) as unknown;
        const rawTo = (ctx?.request?.query?.to ?? ctx?.query?.to) as unknown;

        const from = typeof rawFrom === 'string' && rawFrom.trim().length > 0 ? rawFrom.trim() : undefined;
        const to = typeof rawTo === 'string' && rawTo.trim().length > 0 ? rawTo.trim() : undefined;

        const history = getHistoricalSearchIndexMetrics(limit, from, to);

        // Response format:
        // {
        //   now: number (ms since epoch),
        //   metrics: SearchIndexMetricsSnapshot | null, // latest snapshot for backward compatibility
        //   history: SearchIndexMetricsHistoryEntry[]   // most-recent-first historical entries
        // }
        ctx.body = {
            now: Date.now(),
            metrics: getLastSearchIndexMetrics(),
            history,
        };
    },
}));
