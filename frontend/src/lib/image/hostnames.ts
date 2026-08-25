/**
 * Single source of truth for image hostname configuration.
 *
 * Used by `next.config.ts` (build-time `remotePatterns`) and by the runtime
 * Image module (`@/src/lib/image`).
 */

export const ALLOWED_IMAGE_HOSTNAMES = [
    'beta.m10z.de',
    'cdn.akamai.steamstatic.com',
    'cms.m10z.de',
    'image.api.playstation.com',
    'localhost',
    'm10z.de',
    'shared.akamai.steamstatic.com',
    'shared.fastly.steamstatic.com',
    'shared.steamstatic.com',
] as const;

/**
 * The configured Strapi origin parsed from the environment, or null when
 * unset/unparseable.
 */
function getStrapiOrigin(): {protocol: 'http' | 'https'; hostname: string; port?: string} | null {
    const raw = process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL;
    if (!raw) return null;
    try {
        const url = new URL(raw);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        return {
            protocol: url.protocol === 'http:' ? 'http' : 'https',
            hostname: url.hostname,
            port: url.port || undefined,
        };
    } catch {
        return null;
    }
}

function isLocalHostname(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/**
 * Whether the image optimizer must be allowed to fetch from local IPs.
 *
 * True when the operator explicitly configured a local Strapi origin
 * (local prod-like setups with the CMS on localhost/127.0.0.1). In real
 * production STRAPI_URL points at a public host, so Next's private-IP
 * blocking stays enabled.
 */
export function allowLocalImageIp(): boolean {
    const origin = getStrapiOrigin();
    return origin !== null && isLocalHostname(origin.hostname);
}

export function getRemotePatterns() {
    // No blanket localhost rule: the optimizer may only fetch from a local
    // origin when STRAPI_URL explicitly points at one (and only that exact
    // hostname/port). Otherwise local hosts are never allowed in the
    // production optimizer.
    const patterns: Array<{protocol: 'http' | 'https'; hostname: string; port?: string}> = ALLOWED_IMAGE_HOSTNAMES.filter(
        (hostname) => hostname !== 'localhost',
    ).map((hostname) => ({protocol: 'https' as const, hostname}));

    const origin = getStrapiOrigin();
    if (origin && isLocalHostname(origin.hostname)) {
        patterns.push({protocol: origin.protocol, hostname: origin.hostname, port: origin.port});
    }

    return patterns;
}
