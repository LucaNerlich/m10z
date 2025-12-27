/**
 * List of allowed image hostnames for Next.js Image optimization.
 * This is the single source of truth for image hostname configuration.
 * Both next.config.ts and runtime code import from this file.
 */

export const ALLOWED_IMAGE_HOSTNAMES = [
    'beta.m10z.de',
    'cdn.akamai.steamstatic.com',
    'cms.m10z.de',
    'shared.fastly.steamstatic.com',
    'localhost',
    'shared.akamai.steamstatic.com',
    'm10z.de',
] as const;

/**
 * Helper to generate remotePatterns from the hostname list.
 * Used by next.config.ts to generate remotePatterns configuration.
 */
export function getRemotePatterns() {
    return ALLOWED_IMAGE_HOSTNAMES.map((hostname) => {
        // Handle localhost with port
        if (hostname === 'localhost') {
            return {protocol: 'http' as const, hostname, port: '1337'};
        }
        // All others use HTTPS
        return {protocol: 'https' as const, hostname};
    });
}

