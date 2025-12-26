/**
 * Utility functions for image handling and validation.
 */

/**
 * List of allowed image hostnames from next.config.ts
 * This should be kept in sync with the remotePatterns configuration.
 */
const ALLOWED_HOSTNAMES = [
    'localhost',
    'irgendwasmitkunden.de',
    'picnotes.de',
    'lucanerlich.com',
    'api-m10z.lucanerlich.com',
    'm10z.lucanerlich.com',
    'm10z.de',
    'api.m10z.de',
    'cms.m10z.de',
    'beta.m10z.de',
];

/**
 * Checks if a URL's hostname is allowed for Next.js Image optimization.
 * 
 * @param url - The image URL to check
 * @returns true if the hostname is allowed, false otherwise
 */
export function isImageHostnameAllowed(url: string): boolean {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        // Check exact match or subdomain match
        return ALLOWED_HOSTNAMES.some((allowed) => {
            if (hostname === allowed) {
                return true;
            }
            // Check if hostname is a subdomain of allowed domain
            return hostname.endsWith(`.${allowed}`);
        });
    } catch {
        // Invalid URL format
        return false;
    }
}

