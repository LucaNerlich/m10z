/**
 * Utility functions for safely handling and categorizing errors.
 */

/**
 * Safely extracts an error message from an unknown error value.
 *
 * Handles various error types:
 * - Error instances: returns error.message
 * - Objects with message property: returns the message string
 * - Strings: returns the string as-is
 * - Other values: returns String(value) or a fallback message
 *
 * @param error - The error value to extract a message from
 * @returns A string representation of the error message
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message;
    }

    return String(error ?? 'Unknown error');
}

/**
 * Determines if an error is a timeout or socket-related connection error.
 *
 * Checks the error message for common timeout and socket error indicators:
 * - 'timeout' - Request timeout errors
 * - 'connection error' - Generic connection errors
 * - 'ECONNRESET' - Connection reset by peer
 * - 'ECONNREFUSED' - Connection refused
 * - 'UND_ERR_SOCKET' - Undici socket errors
 *
 * @param error - The error to check
 * @returns true if the error appears to be a timeout or socket error, false otherwise
 */
export function isTimeoutOrSocketError(error: unknown): boolean {
    const message = getErrorMessage(error).toLowerCase();

    return (
        message.includes('timeout') ||
        message.includes('connection error') ||
        message.includes('econnreset') ||
        message.includes('econnrefused') ||
        message.includes('und_err_socket')
    );
}

/**
 * Determines if an error represents a genuine "not found" response, as opposed
 * to a transient failure (timeout, socket error, 5xx) that should be rethrown
 * so ISR keeps serving the last successfully cached page.
 *
 * @param error - The error to check
 * @returns true if the error message indicates a 404/not-found response
 */
export function isNotFoundError(error: unknown): boolean {
    const message = getErrorMessage(error).toLowerCase();

    return message.includes('404') || message.includes('not found');
}

/**
 * Detects a stale-build module/chunk loading error: a browser tab that loaded
 * before a deployment tries to load a JS chunk that no longer exists under the
 * new build. No in-page retry can fix this — only a full reload against the
 * current deployment can, since it fetches a fresh HTML shell and chunk graph.
 *
 * The same signatures used to fire during App Router client navigations into
 * `[slug]` segments that had a route-level `loading.tsx`. Those files were
 * removed; remaining hits should be genuine post-deploy chunk drift.
 *
 * @param error - The error to check
 * @returns true if the error message matches a known stale-chunk signature
 */
export function isStaleChunkError(error: unknown): boolean {
    const message = getErrorMessage(error).toLowerCase();

    return (
        message.includes('loading chunk') ||
        message.includes('chunkloaderror') ||
        message.includes('module factory is not available') ||
        message.includes('failed to fetch dynamically imported module')
    );
}

