/**
 * Pure file-handling helpers for the podcast duration middleware.
 *
 * Extracted from `duration.ts` so the file-identity comparison can be unit-tested
 * without Strapi or the filesystem. The path-traversal guard lives in
 * `utils/resolveFileWithinPublicDir.ts`, shared with the blurhash cron.
 */

import type {FileReference} from '../types/middleware';

export type FileIdentifier = number | string | FileReference | FileReference[] | null | undefined;

/** A single populated file reference, or null for primitives / to-many values. */
function singleFile(file: FileIdentifier): FileReference | null {
    if (!file || Array.isArray(file) || typeof file !== 'object') return null;
    return file;
}

/** Whether a reference carries at least one identifier we can compare. */
export function hasFileIdentity(file: FileIdentifier): boolean {
    if (typeof file === 'number') return Number.isFinite(file);
    if (typeof file === 'string') return file.length > 0;
    const ref = singleFile(file);
    return Boolean(ref && (ref.id || ref.documentId || ref.url));
}

/**
 * Compare two references to the same Strapi upload file.
 *
 * Strapi accepts the same file as a numeric id, a documentId string, or a
 * populated object; the existing record's random `documentId` must not be
 * compared against an incoming numeric `id` (that made an unchanged file look
 * like a replacement and cleared the duration).
 */
export function isSameFileReference(
    existing: FileIdentifier,
    incoming: FileIdentifier,
): boolean {
    const existingRef = singleFile(existing);
    if (!existingRef) return false;

    const sameId = (candidate: number | string | undefined): boolean =>
        candidate !== undefined &&
        candidate !== null &&
        existingRef.id !== undefined &&
        String(existingRef.id) === String(candidate);

    if (typeof incoming === 'number') return sameId(incoming);
    if (typeof incoming === 'string') {
        return (
            (existingRef.documentId !== undefined && existingRef.documentId === incoming) ||
            sameId(incoming)
        );
    }

    const incomingRef = singleFile(incoming);
    if (!incomingRef) return false;

    if (sameId(incomingRef.id)) return true;
    if (
        incomingRef.documentId &&
        existingRef.documentId &&
        incomingRef.documentId === existingRef.documentId
    ) {
        return true;
    }
    return Boolean(incomingRef.url && existingRef.url && incomingRef.url === existingRef.url);
}
