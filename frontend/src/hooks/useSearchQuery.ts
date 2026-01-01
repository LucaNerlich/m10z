import {useEffect, useState} from 'react';
import useSWR from 'swr';
import {type SearchRecord} from '@/src/lib/search/types';
import {fetcher} from '@/src/lib/swr/config';

const SEARCH_INDEX_URL = '/api/search-index';

type SearchQueryResponse = {
    results: Array<SearchRecord & {score?: number | null}>;
    total: number;
    query: string;
};

/**
 * SWR hook for performing search queries with automatic debouncing.
 *
 * This hook:
 * - Fetches search results from `/api/search-index?q=...`
 * - Only fetches when query length > 0 (conditional fetching)
 * - Automatically debounces the query to avoid excessive API calls
 * - Handles loading states, errors, and caching
 * - Caches results per query string
 * - Uses SWR's deduplication to prevent duplicate requests
 *
 * @param query - The search query string (will be trimmed automatically)
 * @param debounceMs - Debounce delay in milliseconds (default: 150ms)
 * @returns Object containing:
 *   - `results`: Array of search results (empty array while loading or if no query)
 *   - `total`: Total number of results
 *   - `error`: Error object if fetch failed (undefined otherwise)
 *   - `isLoading`: Boolean indicating if the initial load is in progress
 *   - `isValidating`: Boolean indicating if a revalidation is in progress
 */
export function useSearchQuery(query: string, debounceMs: number = 150) {
    const [debouncedQuery, setDebouncedQuery] = useState<string>('');

    // Debounce the query value
    useEffect(() => {
        const trimmed = query.trim();
        const timeoutId = setTimeout(() => {
            setDebouncedQuery(trimmed);
        }, debounceMs);

        return () => clearTimeout(timeoutId);
    }, [query, debounceMs]);

    // Use SWR with conditional key - only fetch when debouncedQuery length > 0
    // Match Fuse config (minMatchCharLength: 2) and avoid hammering the server for 1-char queries.
    const shouldFetch = debouncedQuery.length >= 2;
    const swrKey = shouldFetch ? `${SEARCH_INDEX_URL}?q=${encodeURIComponent(debouncedQuery)}` : null;

    const {data, error, isLoading, isValidating} = useSWR<SearchQueryResponse>(
        swrKey,
        fetcher,
        {
            // Don't revalidate on focus for search queries (user is actively typing)
            revalidateOnFocus: false,
            // Avoid revalidation storms on flaky connections for user-typed queries
            revalidateOnReconnect: false,
            // Don't continuously revalidate already-fetched queries
            revalidateIfStale: false,
        },
    );

    // Return empty results immediately if query is empty (before debounce completes)
    if (query.trim().length === 0) {
        return {
            results: [],
            total: 0,
            error: undefined,
            isLoading: false,
            isValidating: false,
        };
    }

    return {
        results: data?.results ?? [],
        total: data?.total ?? 0,
        error,
        isLoading,
        isValidating,
    };
}

