/**
 * Pure helpers for the audio-files migration script.
 *
 * Extracted from `migrate-audio-files.ts` so the URL validation (SSRF guard),
 * filename extraction, and MIME mapping can be unit-tested without running the
 * one-off migration or performing network/file I/O.
 */

import path from 'path';

const ALLOWED_DOMAIN = 'm10z.picnotes.de';

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
 * Build the multipart body for a Strapi file upload.
 *
 * Uses the runtime's global `FormData`/`Blob`; `fetch` sets the multipart
 * Content-Type boundary itself, so callers pass no explicit header for it.
 */
export function buildUploadFormData(fileBuffer: Buffer, filename: string): FormData {
    const form = new FormData();
    form.append('files', new Blob([fileBuffer], {type: getMimeType(filename)}), filename);
    return form;
}

/**
 * Outcome of interpreting the body of a `POST /api/upload` 2xx response.
 */
export type UploadResponseOutcome =
    | {status: 'uploaded'; id: number; url: string}
    | {status: 'existing'; id: number; url: string}
    | {status: 'unexpected'; message: string};

const UPLOAD_BODY_PREVIEW_LENGTH = 200;

/**
 * Interpret the parsed body of a `POST /api/upload` response.
 *
 * Strapi answers with an array of uploaded files. Any other 2xx body is ambiguous:
 * the request was accepted, so the upload may still have succeeded server-side.
 * `lookupExisting` (the media-library lookup for the file being uploaded) is
 * therefore consulted before declaring the body unexpected — an existing file
 * means the upload went through and the caller must treat it as success instead
 * of retrying (a retry would POST the same file a second time). The unexpected
 * message carries a truncated body preview so a huge/garbage body cannot flood
 * the log.
 */
export async function interpretUploadResponse(
    parsed: unknown,
    lookupExisting: () => Promise<{id: number; url: string} | null>,
): Promise<UploadResponseOutcome> {
    const uploaded = Array.isArray(parsed) ? (parsed[0] as {id?: unknown; url?: unknown}) : undefined;
    if (uploaded && typeof uploaded.id === 'number') {
        return {
            status: 'uploaded',
            id: uploaded.id,
            url: typeof uploaded.url === 'string' ? uploaded.url : '',
        };
    }

    const existing = await lookupExisting();
    if (existing) return {status: 'existing', id: existing.id, url: existing.url};

    const received = JSON.stringify(parsed) ?? String(parsed);
    const preview =
        received.length > UPLOAD_BODY_PREVIEW_LENGTH
            ? `${received.slice(0, UPLOAD_BODY_PREVIEW_LENGTH)}…`
            : received;
    return {
        status: 'unexpected',
        message: `Unexpected Strapi upload response format. Expected array with file objects, got: ${preview}`,
    };
}

/**
 * Result of the idempotency lookup for an upload.
 *
 * `absent` means the media library answered and has no such file, so uploading is
 * safe. `unknown` means the lookup itself failed, so the caller cannot tell whether
 * an accepted upload landed — it must fail the file rather than retry the POST.
 */
export type ExistingFileLookup =
    | {status: 'found'; file: {id: number; url: string}}
    | {status: 'absent'}
    | {status: 'unknown'; reason: string};

export type UploadRetryDecision = 'recovered' | 'retry' | 'fail';

/** Map a media-library lookup to the retry action. */
export function decideUploadRetry(lookup: ExistingFileLookup): UploadRetryDecision {
    if (lookup.status === 'found') return 'recovered';
    if (lookup.status === 'unknown') return 'fail';
    return 'retry';
}

/**
 * Look up an already-uploaded media file by name (idempotency check for the
 * migration script). Pure w.r.t. Strapi: the fetch implementation, API base
 * URL, and token are passed in, so this is unit-testable without network I/O.
 *
 * The fetch contract is deliberately minimal and structural so the global
 * fetch and test doubles satisfy it.
 */
export async function findExistingFileByName(
    fetchFn: (
        url: string,
        init?: {method?: string; headers?: Record<string, string>},
    ) => Promise<{ok: boolean; status?: number; json: () => Promise<unknown>}>,
    apiBase: string,
    apiToken: string,
    filename: string,
): Promise<ExistingFileLookup> {
    try {
        const query = `filters[name][$eq]=${encodeURIComponent(filename)}`;
        const res = await fetchFn(`${apiBase}/api/upload/files?${query}`, {
            method: 'GET',
            headers: {Authorization: `Bearer ${apiToken}`},
        });
        if (!res.ok) {
            return {
                status: 'unknown',
                reason: `media library request failed${typeof res.status === 'number' ? ` (HTTP ${res.status})` : ''}`,
            };
        }
        const json: unknown = await res.json();
        const payload = Array.isArray(json) ? json : (json as {results?: unknown} | null)?.results;
        if (!Array.isArray(payload)) {
            return {status: 'unknown', reason: 'unexpected media library response body'};
        }
        const match = payload.find(
            (file): file is {id: number; url?: string} =>
                typeof file === 'object' &&
                file !== null &&
                (file as {name?: unknown}).name === filename &&
                typeof (file as {id?: unknown}).id === 'number',
        );
        return match
            ? {status: 'found', file: {id: match.id, url: match.url ?? ''}}
            : {status: 'absent'};
    } catch (err) {
        return {status: 'unknown', reason: err instanceof Error ? err.message : String(err)};
    }
}
