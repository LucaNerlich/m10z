import {ALLOWED_IMAGE_HOSTNAMES} from './imageHostnames';

/**
 * Utility functions for image handling and validation.
 */

/**
 * Checks if a URL's hostname is allowed for Next.js Image optimization.
 * Uses the shared ALLOWED_IMAGE_HOSTNAMES constant from imageHostnames.ts.
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
        return ALLOWED_IMAGE_HOSTNAMES.some((allowed) => {
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

