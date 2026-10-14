/**
 * Pure file-handling helpers for the podcast duration middleware.
 *
 * Extracted from `duration.ts` so the file-identity comparison can be unit-tested
 * without Strapi or the filesystem. The path-traversal guard lives in
 * `utils/resolveFileWithinPublicDir.ts`, shared with the blurhash cron.
 */

import type {FileReference} from '../types/middleware';

/**
 * Derive a stable identity string for a Strapi file reference.
 *
 * Used to detect whether an update actually changes the audio file so the
 * (expensive) duration extraction can be skipped when it does not.
 *
 * @returns A string identity, or `null` when no identity can be derived.
 */
export function normalizeFileIdentity(
    file: number | string | FileReference | FileReference[] | null | undefined,
): string | null {
    if (!file) return null;
    if (typeof file === 'string' || typeof file === 'number') {
        return String(file);
    }
    // A populated to-many relation carries no single identity of its own.
    if (!Array.isArray(file) && typeof file === 'object') {
        if (file.documentId) return String(file.documentId);
        if (file.id) return String(file.id);
        if (file.url) return `url:${file.url}`;
    }
    return null;
}
