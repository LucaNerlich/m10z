import type {SWRConfiguration} from 'swr';

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
export async function fetcher<T = unknown>(url: string): Promise<T> {
    const res = await fetch(url);

    if (!res.ok) {
        // Fail securely: do not include response body (may leak details).
        throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    }

    try {
        return (await res.json()) as T;
    } catch (error) {
        // Fail securely: do not expose parsing errors that might contain sensitive data.
        throw new Error('Invalid response format');
    }
}

/**
 * Global SWR configuration: no refetch on focus (search results stay put while
 * the user types), refetch on reconnect, 2s request deduplication, and limited
 * retries that skip timeouts/socket errors and rate-limit/gateway failures.
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
        if (message.includes('timeout') || message.includes('socket')) return false;

        // Avoid retry storms on rate limiting and common upstream gateway failures.
        // We infer status from the error message because our fetcher throws a generic Error.
        if (message.includes('429') || message.includes('too many requests')) return false;
        if (message.includes('502') || message.includes('bad gateway')) return false;
        if (message.includes('503') || message.includes('service unavailable')) return false;

        return true;
    },
    onError: (error) => {
        // Log errors for debugging, but don't expose sensitive information
        console.error('[SWR] Request failed:', error instanceof Error ? error.message : 'Unknown error');
    },
};

