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

export function getRemotePatterns() {
    return ALLOWED_IMAGE_HOSTNAMES.map((hostname) => {
        if (hostname === 'localhost') {
            return {protocol: 'http' as const, hostname, port: '1337'};
        }
        return {protocol: 'https' as const, hostname};
    });
}
