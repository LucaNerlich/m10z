import {recordDiagnosticEvent} from '@/src/lib/diagnostics/runtimeDiagnostics';
import {isTimeoutOrSocketError} from '@/src/lib/errors';
import {type StrapiPopulate} from '@/src/lib/strapi-queries/populate';

// The one seam every Strapi request crosses. Owns base-URL resolution, optional
// Bearer auth, Next cache directives, timeout, a single transient-failure retry,
// and diagnostics. Tests swap the transport for an in-memory adapter; everything
// else uses `defaultStrapiTransport`.

export function getStrapiApiBaseUrl(): URL {
    // Prefer server-only env var (not bundled into client JS); fall back to NEXT_PUBLIC_* for
    // backward compatibility and for client components that need the URL for image resolution.
    const raw = process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL;
    if (!raw) {
        throw new Error(
            'Missing STRAPI_URL (or NEXT_PUBLIC_STRAPI_URL). Set it (e.g. STRAPI_URL=http://localhost:1337).',
        );
    }

    try {
        return new URL(raw);
    } catch {
        throw new Error(
            `Invalid STRAPI_URL: "${raw}". Expected a valid absolute URL like "http://localhost:1337".`,
        );
    }
}

// Cache directives are part of the interface, not hidden inside callers.
// `no-store` fully bypasses the fetch cache (Next treats `revalidate: 0` as
// "revalidate immediately", not "don't cache") and may still carry tags.
type StrapiCacheDirective =
    | {mode: 'tags'; tags: string[]; revalidate?: number}
    | {mode: 'no-store'; tags?: string[]};

// Read mode is part of the interface, not a per-caller env lookup. `public` (the
// default) reads the CMS unauthenticated; `privileged` attaches the server-only
// STRAPI_API_TOKEN. Callers express intent; the transport owns the secret.
type StrapiAuthMode = 'public' | 'privileged';

export type StrapiRequest = {
    // Path relative to the Strapi base URL, query string included, e.g. "/api/articles?…".
    path: string;
    cache: StrapiCacheDirective;
    // Read mode. Omit (or 'public') for content reads; 'privileged' for feeds/search.
    auth?: StrapiAuthMode;
    // Escape hatch for an explicit Bearer token; takes precedence over `auth`.
    token?: string;
    timeoutMs?: number;
    diagnosticName?: string;
    context?: {slug?: string; contentType?: string; populateOptions?: StrapiPopulate};
};

export type StrapiTransport = <T>(req: StrapiRequest) => Promise<T>;

// The single place the privileged token is read from the environment.
function resolveToken(req: StrapiRequest): string | undefined {
    if (req.token) return req.token;
    if (req.auth !== 'privileged') return undefined;

    const token = process.env.STRAPI_API_TOKEN?.trim();
    if (!token) {
        // A privileged read without its token would silently become anonymous
        // and surface as "not found" / an empty feed. Fail as a configuration
        // error instead. Never log the token itself.
        throw new Error(
            'STRAPI_API_TOKEN is required for privileged Strapi reads (preview, feeds, search index).',
        );
    }
    return token;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 500;

function tagCountOf(cache: StrapiCacheDirective): number {
    return cache.mode === 'tags' ? cache.tags.length : (cache.tags?.length ?? 0);
}

function buildRequestInit(req: StrapiRequest): RequestInit {
    const headers = new Headers();
    const token = resolveToken(req);
    if (token) headers.set('Authorization', `Bearer ${token}`);

    if (req.cache.mode === 'no-store') {
        return req.cache.tags
            ? {headers, cache: 'no-store', next: {tags: req.cache.tags}}
            : {headers, cache: 'no-store'};
    }
    return {headers, next: {tags: req.cache.tags, revalidate: req.cache.revalidate}};
}

async function fetchOnce<T>(req: StrapiRequest, url: URL, timeout: number): Promise<T> {
    const diagnosticName = req.diagnosticName ?? 'strapi.fetch';
    const startedAt = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url.toString(), {signal: controller.signal, ...buildRequestInit(req)});

        if (!res.ok) {
            // Release the pooled socket immediately. Next only buffers/consumes
            // the body for cacheable 200s, so a discarded non-OK stream would
            // otherwise pin a pooled undici connection until GC or the body
            // timeout, stalling every other Strapi read during an error burst.
            await res.body?.cancel().catch(() => {});
            const httpError = Object.assign(new Error(`Strapi request failed: ${res.status} ${res.statusText}`), {
                status: res.status,
            });
            throw httpError;
        }

        const body = (await res.json()) as T;

        const durationMs = Date.now() - startedAt;
        if (durationMs >= 800) {
            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'fetch',
                name: diagnosticName,
                ok: true,
                durationMs,
                detail: {path: url.pathname, tagCount: tagCountOf(req.cache)},
            });
        }

        return body;
    } catch (error: unknown) {
        const durationMs = Date.now() - startedAt;

        if (error instanceof Error && error.name === 'AbortError') {
            const timeoutError = new Error(`Strapi request timed out after ${timeout}ms: ${url.toString()}`);
            console.error(
                JSON.stringify({
                    error: 'Request timeout',
                    errorCode: 'TIMEOUT',
                    timeout: true,
                    timeoutMs: timeout,
                    url: url.toString(),
                    context: req.context,
                }),
            );
            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'fetch',
                name: diagnosticName,
                ok: false,
                durationMs,
                detail: {path: url.pathname, error: 'TIMEOUT', timeoutMs: timeout, tagCount: tagCountOf(req.cache)},
            });
            throw timeoutError;
        }

        const err = error as Error & {
            code?: string;
            cause?: Error & {
                code?: string;
                bytesRead?: number;
                bytesWritten?: number;
                localAddress?: string;
                remoteAddress?: string;
            };
        };

        const errorCode = err.code || err.cause?.code;
        const isSocketError =
            errorCode === 'UND_ERR_SOCKET' || errorCode === 'ECONNRESET' || errorCode === 'ECONNREFUSED';

        if (isSocketError) {
            console.error(
                JSON.stringify({
                    error: err.message,
                    errorCode: errorCode || 'UNKNOWN_SOCKET_ERROR',
                    bytesRead: err.cause?.bytesRead,
                    bytesWritten: err.cause?.bytesWritten,
                    localAddress: err.cause?.localAddress,
                    remoteAddress: err.cause?.remoteAddress,
                    timeout: false,
                    url: url.toString(),
                    context: req.context,
                }),
            );
            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'fetch',
                name: diagnosticName,
                ok: false,
                durationMs,
                detail: {
                    path: url.pathname,
                    error: errorCode || 'UNKNOWN_SOCKET_ERROR',
                    tagCount: tagCountOf(req.cache),
                },
            });
            throw new Error(`Strapi connection error (${errorCode}): ${err.message}`);
        }

        if (error instanceof Error) {
            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'fetch',
                name: diagnosticName,
                ok: false,
                durationMs,
                detail: {path: url.pathname, error: 'ERROR', message: error.message, tagCount: tagCountOf(req.cache)},
            });
        }

        throw error;
    } finally {
        // The timer stays armed through the body read: only consuming the
        // response completes the request, not merely receiving its headers.
        clearTimeout(timeoutId);
    }
}

// The production adapter: real `fetch`, base-URL resolution, timeout, one retry on
// transient failures, and diagnostics. The deep implementation behind the seam.
const defaultStrapiTransport: StrapiTransport = async <T>(req: StrapiRequest): Promise<T> => {
    const timeout = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const url = new URL(req.path, getStrapiApiBaseUrl());

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await fetchOnce<T>(req, url, timeout);
        } catch (error) {
            lastError = error;
            // Only retry on transient network/timeout failures — not on 4xx/5xx HTTP
            // responses (the transport's own HTTP errors carry a numeric `status`;
            // their statusText can still contain "Timeout"), which indicate
            // server-side issues that won't resolve by retrying.
            const hasHttpStatus = typeof (error as {status?: unknown})?.status === 'number';
            if (attempt < MAX_RETRIES && !hasHttpStatus && isTimeoutOrSocketError(error)) {
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
};

let activeTransport: StrapiTransport = defaultStrapiTransport;

// The single entry point callers use. Delegates to whichever transport is active.
export function strapiFetch<T>(req: StrapiRequest): Promise<T> {
    return activeTransport<T>(req);
}

// Test seam: swap in an in-memory adapter. Not for production use.
export function __setStrapiTransport(transport: StrapiTransport): void {
    activeTransport = transport;
}

export function __resetStrapiTransport(): void {
    activeTransport = defaultStrapiTransport;
}
