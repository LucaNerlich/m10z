import type {Fetcher, SWRConfiguration} from 'swr';

/**
 * Secure fetcher function for SWR that handles errors without exposing sensitive information.
 *
 * This fetcher:
 * - Validates response status codes
 * - Provides generic error messages that don't leak backend details
 * - Handles JSON parsing errors securely
 * - Maintains security best practices for error handling
 *
 * @param url - The URL to fetch
 * @returns The parsed JSON response
 * @throws Error with a generic message if the request fails
 */
const fetcher: Fetcher<unknown, string> = async (url: string) => {
    const res = await fetch(url);

    if (!res.ok) {
        // Fail securely: do not include response body (may leak details).
        throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    }

    try {
        return await res.json();
    } catch (error) {
        // Fail securely: do not expose parsing errors that might contain sensitive data.
        throw new Error('Invalid response format');
    }
};

/**
 * Global SWR configuration for the application.
 *
 * Configuration options:
 * - `revalidateOnFocus: false` - Don't refetch on window focus (prevents unnecessary requests for search)
 * - `revalidateOnReconnect: true` - Refetch when network reconnects (ensures fresh data after offline)
 * - `dedupingInterval: 2000` - Deduplicate requests within 2 seconds (prevents duplicate requests)
 * - `errorRetryCount: 3` - Retry failed requests up to 3 times
 * - `errorRetryInterval: 5000` - Wait 5 seconds between retries
 * - `shouldRetryOnError: true` - Enable automatic retry on errors
 */
export const swrConfig: SWRConfiguration = {
    fetcher,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
    errorRetryCount: 1,
    errorRetryInterval: 3000,
    shouldRetryOnError: (error) => {
        // Don't retry on timeout/socket errors
        const message = error?.message?.toLowerCase() || '';
        return !(message.includes('timeout') || message.includes('socket'));
    },
    onError: (error) => {
        // Log errors for debugging, but don't expose sensitive information
        console.error('[SWR] Request failed:', error instanceof Error ? error.message : 'Unknown error');
    },
};

