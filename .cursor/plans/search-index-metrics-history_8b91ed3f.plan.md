---
name: search-index-metrics-history
overview: Convert search index metrics to an in-memory history with bounded cleanup and extend the metrics API to expose historical data while preserving the existing response shape.
todos:
  - id: introduce-metrics-history-storage
    content: Replace single lastMetrics variable with metricsHistory array, export SearchIndexMetricsHistoryEntry type, and add getAllSearchIndexMetrics helper.
    status: completed
  - id: implement-metrics-cleanup
    content: Implement cleanupMetricsHistory with 30-day age filter and MAX_METRICS_ENTRIES cap, and wire it into buildAndPersistSearchIndex.
    status: completed
  - id: implement-historical-metrics-helper
    content: Add getHistoricalSearchIndexMetrics(limit, from, to) in searchIndexBuilder.ts with filtering, limits, and documentation comments.
    status: completed
  - id: extend-metrics-controller-response
    content: Update search-index metrics controller to parse query parameters, call getHistoricalSearchIndexMetrics, and return { now, metrics, history }.
    status: completed
isProject: false
---

## Goals

- **Task 1**: Replace the single `lastMetrics` snapshot with an in-memory `metricsHistory` array that stores recent build metrics, with automatic age- and size-based cleanup.
- **Task 2**: Extend the search-index metrics API to return a `history` array derived from the in-memory metrics history, while keeping the existing `metrics` field unchanged for backward compatibility.

## Task 1: In-memory metrics history with cleanup

- **Introduce history storage and types**
- In [`backend/src/services/searchIndexBuilder.ts`](backend/src/services/searchIndexBuilder.ts), replace `let lastMetrics: SearchIndexMetricsSnapshot | null = null` with `let metricsHistory: SearchIndexMetricsSnapshot[] = []`.
- Add and export a new type alias `SearchIndexMetricsHistoryEntry` for history entries, e.g. `export type SearchIndexMetricsHistoryEntry = SearchIndexMetricsSnapshot;`, so consumers can use a stable exported type without exposing internal implementation details.
- Update `getLastSearchIndexMetrics()` to return the most recent entry from `metricsHistory` (`metricsHistory[0] ?? null`).
- Add a new exported function `getAllSearchIndexMetrics()` that returns the full history array, preferably as a shallow copy to avoid external mutation (`return [...metricsHistory];`).

- **Add bounded cleanup for metrics history**
- Define constants near the top of the metrics section:
- `const MAX_METRICS_ENTRIES = 1000;`
- `const METRICS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days`
- Implement an internal `cleanupMetricsHistory(now: number = Date.now()): void` helper that:
- Computes a cutoff timestamp `const cutoff = now - METRICS_MAX_AGE_MS;`.
- Filters `metricsHistory` to keep only entries whose parsed `updatedAt` is valid and `>= cutoff`.
- After age filtering, enforces the size cap: if `metricsHistory.length > MAX_METRICS_ENTRIES`, slice the array to `metricsHistory.slice(0, MAX_METRICS_ENTRIES)`.

- **Update metrics write path to use history**
- In `buildAndPersistSearchIndex()` in the same file:
- Before adding a new metrics snapshot, call `cleanupMetricsHistory();` so age- and size-based pruning happens first.
- Replace the `lastMetrics = {...}` assignment with logic that unshifts the new snapshot into the front of the array:
- Construct the snapshot with `updatedAt: new Date().toISOString()` and `source: options?.source`.
- Use `metricsHistory.unshift(snapshot);` so the most recent entry is always at index 0.
- Optionally, re-apply a quick size check after unshift (e.g. if `metricsHistory.length > MAX_METRICS_ENTRIES`, trim) to be robust against concurrent writers, even though only one code path is expected today.

## Task 2: Historical metrics API

- **Historical query helper in service layer**
- In `searchIndexBuilder.ts`, add and export `getHistoricalSearchIndexMetrics(limit = 30, from?: string, to?: string): SearchIndexMetricsHistoryEntry[]`.
- Implementation details:
- Start from the in-memory `metricsHistory` (already sorted most-recent-first by the unshift logic).
- Safely parse `from` and `to` ISO strings using `Date.parse`; if parsing fails, ignore that bound instead of throwing.
- Filter entries by `updatedAt` timestamp to satisfy the optional date range:
- If `from` is valid, keep entries where `updatedAt >= from`.
- If `to` is valid, keep entries where `updatedAt <= to`.
- Apply a defensive limit: normalize `limit` to a positive integer, defaulting to 30, and cap it at `MAX_METRICS_ENTRIES`.
- Return the filtered array sliced to the computed `limit`.
- Add concise code comments documenting that the history is most-recent-first, the meaning of `limit`, `from`, and `to`, and that the function is intended for diagnostics/monitoring only (in-memory, non-persistent).

- **Extend the metrics controller to expose history**
- In [`backend/src/api/search-index/controllers/search-index.ts`](backend/src/api/search-index/controllers/search-index.ts):
- Update imports to include `getHistoricalSearchIndexMetrics` (and optionally `SearchIndexMetricsHistoryEntry` if needed) from the service module.
- Within the existing `metrics(ctx)` action, after authentication and rate limiting succeed, parse query parameters:
- `limit`: read from `ctx.request.query.limit` / `ctx.query.limit`, ensure it is a string, parse to a number, require it to be finite and `> 0`, and cap it at 1000.
- `from` and `to`: read from query, ensure they are non-empty strings; pass them through as-is to the service, relying on the service to validate/ignore invalid dates.
- Call `const history = getHistoricalSearchIndexMetrics(limit, from, to);`.
- Keep the existing `metrics` field as is (`metrics: getLastSearchIndexMetrics()`), and extend the response body to:
- `ctx.body = { now: Date.now(), metrics: getLastSearchIndexMetrics(), history };`
- Add inline comments above the handler or the parsing block documenting:
- Supported query parameters: `limit` (integer, default 30, max 1000), `from` and `to` (ISO date strings used as inclusive bounds on `updatedAt`).
- Response structure: `{ now, metrics, history }`, where `metrics` is the latest snapshot (for backward compatibility) and `history` is a most-recent-first array of historical entries.

## Safety, validation, and constraints

- **Input validation and robustness**
- Ensure all query params (`limit`, `from`, `to`) are treated as untrusted input:
- Never used in file paths, commands, or other dangerous contexts.
- Parsed and validated defensively with fallbacks and upper bounds to avoid abuse or denial-of-service via huge limits.
- Handle invalid date strings gracefully in `getHistoricalSearchIndexMetrics()` by ignoring bad bounds rather than throwing.

- **Testing and verification (manual)**
- After implementation, manually (or via existing tests, if present) verify:
- Building the search index multiple times produces multiple history entries and `getLastSearchIndexMetrics()` still returns the latest one.
- The cleanup logic removes entries older than 30 days and caps the array at 1000 entries.
- The metrics endpoint without query params still returns the original shape, and now includes `history` with default limit 30.
- The endpoint correctly applies `limit`, `from`, and `to` filters and behaves sensibly with invalid values (e.g. negative limits or malformed dates).