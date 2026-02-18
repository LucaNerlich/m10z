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
    m12g: '/m12g',
    audioFeed: '/audiofeed.xml',
    articleFeed: '/rss.xml',
    feeds: '/feeds',
    forum: 'https://forum.m10z.de',
    discord: 'https://discord.gg/G5ngm7S6wF',
    youtube: 'https://www.youtube.com/@M10Z_TV',
    twitch: 'https://www.twitch.tv/m10z_tv',
    linktree: 'https://linktr.ee/m10z',
    twitter: '@m10z_tv',
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
