/**
 * Path-traversal guard for Strapi-served file URLs.
 *
 * Shared by the duration middleware and the blurhash cron, which previously each
 * carried their own copy of the same containment check - a security rule that must
 * not be able to drift between them.
 */

import {resolve, sep} from 'path';

/**
 * Resolve a Strapi-served file URL to an absolute path inside `publicDir`.
 *
 * Guards against path traversal by ensuring the resolved path stays within the
 * resolved public directory, including against sibling directories that merely
 * share the directory's name as a prefix (`public` vs `public-evil`).
 *
 * @returns The resolved absolute file path, or `null` if it would escape `publicDir`.
 */
export function resolveFileWithinPublicDir(publicDir: string, fileUrl: string): string | null {
    // Remove leading slash if present to handle relative URLs
    const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
    const filePath = resolve(publicDir, relativePath);

    const resolvedPublicDir = resolve(publicDir);
    if (filePath !== resolvedPublicDir && !filePath.startsWith(resolvedPublicDir + sep)) {
        return null;
    }
    return filePath;
}
