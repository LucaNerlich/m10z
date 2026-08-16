/**
 * Pure helpers for the audio-files migration script.
 *
 * Extracted from `migrate-audio-files.ts` so the URL validation (SSRF guard),
 * filename extraction, and MIME mapping can be unit-tested without running the
 * one-off migration or performing network/file I/O.
 */

import path from 'path';

export const ALLOWED_DOMAIN = 'm10z.picnotes.de';

/**
 * Validate a source URL before downloading.
 *
 * SSRF protection: the URL must parse, target the allowed domain, and use HTTPS.
 * Throws an `Error` describing the first failed check.
 */
export function validateUrl(url: string): void {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        throw new Error(`Invalid URL format: ${url}`);
    }

    // SSRF protection: ensure URL is from allowed domain
    if (parsedUrl.hostname !== ALLOWED_DOMAIN) {
        throw new Error(
            `URL hostname ${parsedUrl.hostname} does not match allowed domain ${ALLOWED_DOMAIN}`,
        );
    }

    // Ensure HTTPS
    if (parsedUrl.protocol !== 'https:') {
        throw new Error(`URL must use HTTPS protocol: ${url}`);
    }
}

/**
 * Extract the basename of a URL's pathname.
 *
 * Throws when no usable filename can be derived.
 */
export function extractFilename(url: string): string {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const filename = path.basename(pathname);

    if (!filename || filename === '/') {
        throw new Error(`Could not extract filename from URL: ${url}`);
    }

    return filename;
}

/**
 * Map a filename extension to an audio MIME type, defaulting to
 * `application/octet-stream` for unknown extensions.
 */
export function getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();

    // Audio MIME types
    const mimeTypes: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.mpeg': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.wave': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.oga': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac',
        '.webm': 'audio/webm',
        '.opus': 'audio/opus',
    };

    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Look up an already-uploaded media file by name (idempotency check for the
 * migration script). Pure w.r.t. Strapi: the fetch implementation, API base
 * URL, and token are passed in, so this is unit-testable without network I/O.
 *
 * @returns `{id, url}` when a file with the exact name exists, otherwise `null`
 * (including when the lookup fails — callers should then proceed normally).
 */
export async function findExistingFileByName(
    fetchFn: (url: string, init?: any) => Promise<any>,
    apiBase: string,
    apiToken: string,
    filename: string,
): Promise<{id: number; url: string} | null> {
    try {
        const query = `filters[name][$eq]=${encodeURIComponent(filename)}`;
        const res = await fetchFn(`${apiBase}/api/upload/files?${query}`, {
            method: 'GET',
            headers: {Authorization: `Bearer ${apiToken}`},
        });
        if (!res.ok) return null;
        const json: any = await res.json();
        const files = Array.isArray(json) ? json : json?.results ?? [];
        const match = files.find((f: any) => f?.name === filename && typeof f?.id === 'number');
        return match ? {id: match.id, url: match.url ?? ''} : null;
    } catch {
        return null;
    }
}
