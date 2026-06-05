/**
 * Pure file-handling helpers for the podcast duration middleware.
 *
 * Extracted from `duration.ts` so the file-identity comparison and the
 * path-traversal guard can be unit-tested without Strapi or the filesystem.
 */

import {resolve} from 'path';

/**
 * Derive a stable identity string for a Strapi file reference.
 *
 * Used to detect whether an update actually changes the audio file so the
 * (expensive) duration extraction can be skipped when it does not.
 *
 * @returns A string identity, or `null` when no identity can be derived.
 */
export function normalizeFileIdentity(file: any): string | null {
    if (!file) return null;
    if (typeof file === 'string' || typeof file === 'number') {
        return String(file);
    }
    if (file.documentId) return String(file.documentId);
    if (file.id) return String(file.id);
    if (file.url) return `url:${file.url}`;
    return null;
}

/**
 * Resolve a Strapi-served file URL to an absolute path inside `publicDir`.
 *
 * Security: guards against path traversal by ensuring the resolved path stays
 * within the resolved public directory.
 *
 * @returns The resolved absolute file path, or `null` if it would escape `publicDir`.
 */
export function resolveFileWithinPublicDir(publicDir: string, fileUrl: string): string | null {
    // Remove leading slash if present to handle relative URLs
    const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
    const filePath = resolve(publicDir, relativePath);

    const resolvedPublicDir = resolve(publicDir);
    if (!filePath.startsWith(resolvedPublicDir)) {
        return null;
    }
    return filePath;
}
