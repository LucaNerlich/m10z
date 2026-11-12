/**
 * Minimum number of characters before a query is sent. Shared with the UI so the
 * status message and the fetch boundary cannot disagree (a one-character query
 * used to report "no results" for a request that was never made).
 */
export const SEARCH_MIN_QUERY_LENGTH = 2;

/**
 * Maximum query length accepted by `/api/search-index`. Shared with the input
 * so a long paste is capped client-side instead of returning a generic error
 * from the route's 400.
 */
export const SEARCH_MAX_QUERY_LENGTH = 200;

/**
 * The user-visible search phase. Derived from the fetch boundary rather than
 * stored, so the status message and the request cannot disagree.
 */
export type SearchStatus = 'idle' | 'too-short' | 'pending' | 'error' | 'empty' | 'ready';

/** The exact string the fetch boundary and the status derivation both use. */
export function normalizeSearchQuery(query: string): string {
    return query.trim().slice(0, SEARCH_MAX_QUERY_LENGTH);
}

type SearchStatusInput = {
    query: string;
    effectiveQuery: string;
    isLoading: boolean;
    error: unknown;
    resultCount: number;
};

/**
 * Reduce the search primitives to one explicit phase.
 *
 * `pending` wins over `error`: while the debounced query lags the typed query,
 * no request exists for the new input yet, so an error from the previous query
 * must not be shown.
 */
export function deriveSearchStatus({
    query,
    effectiveQuery,
    isLoading,
    error,
    resultCount,
}: SearchStatusInput): SearchStatus {
    const trimmed = normalizeSearchQuery(query);
    if (trimmed.length === 0) return 'idle';
    if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) return 'too-short';
    if (effectiveQuery !== trimmed || isLoading) return 'pending';
    if (error) return 'error';
    if (resultCount === 0) return 'empty';
    return 'ready';
}
