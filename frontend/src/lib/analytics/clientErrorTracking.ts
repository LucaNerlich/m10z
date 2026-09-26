import {getErrorMessage} from '@/src/lib/errors';

export const CLIENT_ERROR_EVENT = 'client-error';

const MAX_MESSAGE_LENGTH = 200;

type UmamiTracker = {
    track: (event: string, data?: Record<string, string | number | boolean>) => unknown;
};

export type ClientErrorContext = {
    /** Where the error surfaced, e.g. 'error-boundary', 'global-error'. */
    source: string;
    /** Whether an automatic recovery reload was triggered. */
    reloaded: boolean;
    staleChunk: boolean;
};

/**
 * Builds the Umami event payload for a client-visible error. Kept pure for
 * testing; only the message prefix, digest and path are sent — no stack traces.
 */
export function buildClientErrorEventData(
    error: unknown,
    context: ClientErrorContext,
    path: string
): Record<string, string | number | boolean> {
    const data: Record<string, string | number | boolean> = {
        source: context.source,
        path,
        message: getErrorMessage(error).slice(0, MAX_MESSAGE_LENGTH),
        staleChunk: context.staleChunk,
        reloaded: context.reloaded,
    };

    const digest =
        typeof error === 'object' && error !== null && 'digest' in error
            ? (error as {digest?: unknown}).digest
            : undefined;
    if (typeof digest === 'string' && digest) {
        data.digest = digest;
    }

    return data;
}

/**
 * Reports an error shown by an error boundary to Umami (if loaded), so the
 * actual error text and server digest of rare production failures become
 * visible. Never throws.
 */
export function trackClientError(error: unknown, context: ClientErrorContext): void {
    try {
        if (typeof window === 'undefined') return;
        const umami = (window as unknown as {umami?: UmamiTracker}).umami;
        if (!umami || typeof umami.track !== 'function') return;
        umami.track(CLIENT_ERROR_EVENT, buildClientErrorEventData(error, context, window.location.pathname));
    } catch {
        // Analytics must never break error handling.
    }
}
