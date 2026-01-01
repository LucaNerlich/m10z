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

