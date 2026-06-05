/**
 * Image module — single seam for image URL handling.
 *
 * Two URL provenances cross this module:
 *
 *  1. **Strapi-served**: a media path that may be absolute (CDN) or relative
 *     (e.g. `/uploads/foo.jpg`). Relative paths are prefixed with the Strapi
 *     base URL. Used for markdown images and any media coming from Strapi.
 *  2. **Search-index**: opaque URLs that lack a protocol. Search records may
 *     carry hostname-only strings (e.g. `cms.m10z.de/uploads/...`) or
 *     `localhost:1337/...` references. These do not flow through Strapi base
 *     URL — they receive a scheme based on heuristics.
 *
 * Hostname-allowlist enforcement is centralised here too. The same allowlist
 * is consumed by `next.config.ts` for build-time `remotePatterns`.
 */

import {ALLOWED_IMAGE_HOSTNAMES} from './hostnames';

export {ALLOWED_IMAGE_HOSTNAMES, getRemotePatterns} from './hostnames';

const HTTP_PROTOCOL_RE = /^https?:\/\//i;
const LOCALHOST_RE = /^localhost(?::\d+)?/i;
const LOOPBACK_RE = /^127\.0\.0\.1(?::\d+)?/i;

function getStrapiBaseUrl(): string | null {
    const raw = process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL;
    return raw ? raw.replace(/\/+$/, '') : null;
}

/**
 * Join a Strapi media path or absolute URL with the configured Strapi base URL.
 * Returns null when the input is relative and no base URL is configured.
 */
export function joinStrapiBaseUrl(pathOrUrl: string): string | null {
    if (HTTP_PROTOCOL_RE.test(pathOrUrl)) return pathOrUrl;
    const base = getStrapiBaseUrl();
    if (!base) return null;
    const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${base}${path}`;
}

/**
 * Resolve a Strapi-served image URL to an absolute URL.
 *
 * Returns the input unchanged when already absolute. Prefixes the Strapi base
 * URL when relative. Throws when the Strapi base URL is unset and the input
 * is relative — the caller has constructed an unrenderable URL and the build
 * should fail loudly.
 */
export function resolveStrapiImageUrl(src: string): string {
    const resolved = joinStrapiBaseUrl(src);
    if (!resolved) {
        throw new Error(
            'Missing STRAPI_URL (or NEXT_PUBLIC_STRAPI_URL); cannot resolve relative image URL.',
        );
    }
    return resolved;
}

/**
 * Normalise an opaque URL from the search index.
 *
 * Search records carry URLs that may lack a protocol. Localhost references
 * get `http://`; everything else gets `https://`. Returns null for falsy
 * input.
 */
export function normalizeSearchImageUrl(src: string | null | undefined): string | null {
    if (!src) return null;
    if (HTTP_PROTOCOL_RE.test(src)) return src;
    if (LOCALHOST_RE.test(src) || LOOPBACK_RE.test(src)) return `http://${src}`;
    return `https://${src}`;
}

/**
 * Check whether a URL's hostname is in the allowlist consumed by
 * Next.js Image optimisation. Subdomains of allowed hosts are accepted.
 */
export function isImageHostnameAllowed(url: string | null | undefined): boolean {
    if (!url || typeof url !== 'string') return false;
    try {
        const {hostname} = new URL(url);
        return ALLOWED_IMAGE_HOSTNAMES.some(
            (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
        );
    } catch {
        return false;
    }
}
