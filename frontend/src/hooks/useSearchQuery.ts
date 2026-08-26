import {useEffect, useState} from 'react';
import useSWR from 'swr';
import {type SearchResult} from '@/src/lib/search/types';
import {fetcher} from '@/src/lib/swr/config';

const SEARCH_INDEX_URL = '/api/search-index';

type SearchQueryResponse = {
    results: SearchResult[];
    total: number;
    query: string;
};

/**
 * SWR hook for performing search queries with automatic debouncing.
 *
 * Fetches from `/api/search-index?q=...` once the debounced query reaches the
 * minimum match length, caching results per query string.
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

    useEffect(() => {
        const trimmed = query.trim();
        const timeoutId = setTimeout(() => {
            setDebouncedQuery(trimmed);
        }, debounceMs);

        return () => clearTimeout(timeoutId);
    }, [query, debounceMs]);

    // 2 chars matches the Fuse client config (minMatchCharLength) and avoids
    // hammering the server for 1-char queries.
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
    if (query.trim().length === 0) {        return {
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

