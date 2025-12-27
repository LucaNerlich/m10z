const SITE_URL = (process.env.NEXT_PUBLIC_DOMAIN ?? 'https://m10z.de').replace(/\/+$/, '');

function ensureLeadingSlash(path: string): string {
    if (!path) return '/';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return path.startsWith('/') ? path : `/${path}`;
}

export const routes = {
    siteUrl: SITE_URL,
    home: '/',
    imprint: '/impressum',
    privacy: '/datenschutz',
    about: '/ueber-uns',
    articles: '/artikel',
    article: (slug: string) => `/artikel/${slug}`,
    podcasts: '/podcasts',
    podcast: (slug: string) => `/podcasts/${slug}`,
    categories: '/kategorien',
    category: (slug: string) => `/kategorien/${slug}`,
    authors: '/team',
    author: (slug: string) => `/team/${slug}`,
    audioFeed: '/audiofeed.xml',
    articleFeed: '/rss.xml',
    forum: 'https://forum.m10z.de',
    discord: 'https://discord.gg/G5ngm7S6wF',
    youtube: 'https://www.youtube.com/@M10Z_TV',
    twitch: 'https://www.twitch.tv/m10z_tv',
    linktree: 'https://linktr.ee/m10z',
};

/**
 * Constructs an absolute URL for the given route path.
 *
 * @param path - A route path (relative or without a leading slash) or a full `http://`/`https://` URL
 * @returns An absolute URL string; returns `path` unchanged when it is an `http(s)` URL, otherwise returns the site origin joined with the normalized path
 */
export function absoluteRoute(path: string): string {
    const normalized = ensureLeadingSlash(path);
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        return normalized;
    }
    return `${SITE_URL}${normalized}`;
}

/**
 * Determines whether a given URL points to the same site or is a relative internal path.
 *
 * @param url - The URL or path to check.
 * @returns `true` if the URL is internal (a relative path or has the same hostname as SITE_URL), `false` otherwise.
 */
export function isInternalLink(url: string): boolean {
    if (!url || typeof url !== 'string') {
        return false;
    }

    // Relative internal path
    if (url.startsWith('/')) {
        return true;
    }

    // Anchor link - treat as external (but won't get target="_blank")
    if (url.startsWith('#')) {
        return false;
    }

    // Protocol-specific links (mailto:, tel:, etc.) - treat as external
    if (url.includes(':')) {
        // Check if it's http:// or https://
        if (url.startsWith('http://') || url.startsWith('https://')) {
            // Extract domain from URL
            try {
                const urlObj = new URL(url);
                const urlDomain = urlObj.hostname.toLowerCase();

                // Extract domain from SITE_URL
                const siteUrlObj = new URL(SITE_URL);
                const siteDomain = siteUrlObj.hostname.toLowerCase();

                // Compare domains
                return urlDomain === siteDomain;
            } catch {
                // Invalid URL format - treat as external
                return false;
            }
        }
        // Other protocols (mailto:, tel:, etc.) - treat as external
        return false;
    }

    // Protocol-relative URLs (//example.com) - treat as external
    if (url.startsWith('//')) {
        return false;
    }

    // Default to external for unrecognized formats
    return false;
}
