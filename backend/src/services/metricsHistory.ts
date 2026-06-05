/**
 * Pure selection helpers for search-index metrics history.
 *
 * Extracted from `searchIndexBuilder.ts` so the date-range filtering and limit
 * normalization can be unit-tested without seeding the module-level history.
 */

export type MetricsHistoryEntry = {updatedAt: string};

export const DEFAULT_METRICS_LIMIT = 30;
export const MAX_METRICS_LIMIT = 1000;

/**
 * Filter metrics entries to an inclusive `[from, to]` `updatedAt` range and cap
 * the result to a normalized limit.
 *
 * - Entries with an unparseable `updatedAt` are dropped.
 * - Invalid `from`/`to` strings are ignored (treated as unbounded).
 * - `limit` defaults to 30, falls back to 30 when non-positive/non-finite, and
 *   is capped at `maxLimit` (default 1000).
 * - Order is preserved (callers store history most-recent-first).
 */
export function filterAndLimitMetrics<T extends MetricsHistoryEntry>(
    entries: readonly T[],
    options: {limit?: number; from?: string; to?: string; maxLimit?: number} = {},
): T[] {
    const maxLimit = options.maxLimit ?? MAX_METRICS_LIMIT;

    let fromTs: number | null = null;
    let toTs: number | null = null;

    if (options.from) {
        const parsed = Date.parse(options.from);
        if (!Number.isNaN(parsed)) fromTs = parsed;
    }
    if (options.to) {
        const parsed = Date.parse(options.to);
        if (!Number.isNaN(parsed)) toTs = parsed;
    }

    let normalizedLimit = Number(options.limit ?? DEFAULT_METRICS_LIMIT);
    if (!Number.isFinite(normalizedLimit) || normalizedLimit <= 0) {
        normalizedLimit = DEFAULT_METRICS_LIMIT;
    }
    if (normalizedLimit > maxLimit) {
        normalizedLimit = maxLimit;
    }

    const filtered = entries.filter((entry) => {
        const ts = Date.parse(entry.updatedAt);
        if (Number.isNaN(ts)) return false;
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts > toTs) return false;
        return true;
    });

    return filtered.slice(0, normalizedLimit);
}
