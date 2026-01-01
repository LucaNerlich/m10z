import useSWR from 'swr';
import {type SearchIndexFile} from '@/src/lib/search/types';
import {fetcher} from '@/src/lib/swr/config';

const SEARCH_INDEX_URL = '/api/search-index';

/**
 * SWR hook for fetching the search index.
 *
 * This hook:
 * - Fetches and caches the full search index from `/api/search-index`
 * - Automatically handles loading states, errors, and revalidation
 * - Caches the index across component mounts/unmounts
 * - Uses SWR's deduplication to prevent duplicate requests
 *
 * @returns Object containing:
 *   - `data`: The search index file (undefined while loading)
 *   - `error`: Error object if fetch failed (undefined otherwise)
 *   - `isLoading`: Boolean indicating if the initial load is in progress
 *   - `isValidating`: Boolean indicating if a revalidation is in progress
 */
export function useSearchIndex() {
    const {data, error, isLoading, isValidating} = useSWR<SearchIndexFile>(
        SEARCH_INDEX_URL,
        fetcher,
        {
            // Keep data fresh for 60 seconds (matches API cache duration)
            revalidateIfStale: true,
            // Don't revalidate on focus for search index (it's relatively static)
            revalidateOnFocus: false,
        },
    );

    return {
        data,
        error,
        isLoading,
        isValidating,
    };
}

