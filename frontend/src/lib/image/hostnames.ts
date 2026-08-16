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
    // The localhost pattern (local Strapi) must never be present in production:
    // the image optimizer would be allowed to fetch from the app host's
    // localhost.
    const hostnames =
        process.env.NODE_ENV === 'production'
            ? ALLOWED_IMAGE_HOSTNAMES.filter((hostname) => hostname !== 'localhost')
            : ALLOWED_IMAGE_HOSTNAMES;

    return hostnames.map((hostname) => {
        if (hostname === 'localhost') {
            return {protocol: 'http' as const, hostname, port: '1337'};
        }
        return {protocol: 'https' as const, hostname};
    });
}
