import {isBuildPhase} from '@/src/lib/buildPhase';

/**
 * Shared policy for transient CMS failures in server-rendered detail pages.
 *
 * A failed fetch during `next build` has no cached page to fall back to, and a throw
 * aborts the whole build — so the page degrades to its build-phase fallback. At
 * runtime the error is rethrown so Next's ISR keeps serving the last successfully
 * cached page instead of caching the failure (a 404 or a fallback panel).
 *
 * `fallback` is lazy because callers pass things like `() => notFound()`, which must
 * not run outside the build phase.
 *
 * @param error - The caught fetch error, rethrown outside the build phase.
 * @param fallback - Produces the build-phase fallback value.
 * @returns The fallback value during `next build`; throws `error` otherwise.
 */
export function transientPageFallback<T>(error: unknown, fallback: () => T): T {
    if (isBuildPhase()) return fallback();
    throw error;
}
