/**
 * Classify a markdown link href as internal (same-origin) or external, and
 * normalize internal paths.
 *
 * Every href is parsed against the site URL rather than trusting surface
 * syntax. A leading `/` alone is *not* proof of a same-origin path: WHATWG URL
 * parsing normalizes backslashes to slashes for special schemes, so
 * `/\evil.com` is cross-origin and would otherwise be rendered as an internal
 * Next.js link while a ctrl/cmd-click or new-tab open resolves it to the
 * attacker's origin.
 *
 * In-page anchors (`#foo`) are handled by the caller, which renders them as
 * plain `<a>` elements rather than Next.js `<Link>`.
 */

export type AnchorTarget = {
    /** True when the href points at the current site origin. */
    isInternal: boolean;
    /** True for an absolute or protocol-relative http(s) URL on another origin. Non-web schemes (mailto:, tel:) are neither internal nor external web links. */
    isExternalWeb: boolean;
    /** The normalized href to render: a site-relative path when internal, otherwise the original. */
    href: string;
};

function originOf(siteUrl: string): string {
    try {
        return new URL(siteUrl).origin;
    } catch {
        return siteUrl;
    }
}

export function resolveAnchorTarget(href: string, siteUrl: string): AnchorTarget {
    const siteOrigin = originOf(siteUrl);

    try {
        // Protocol-relative URLs ("//host/path") have no scheme; give them https: so they parse.
        const baseUrl = href.startsWith('//') ? `https:${href}` : href;
        const url = new URL(baseUrl, siteUrl);

        if (url.origin !== siteOrigin) {
            // `mailto:`/`tel:`/`javascript:` parse with origin "null"; only http(s)
            // is a web link that should open in a new tab.
            const isExternalWeb = url.protocol === 'http:' || url.protocol === 'https:';
            return {isInternal: false, isExternalWeb, href};
        }

        let path = url.pathname;
        // Normalize trailing slash (remove for consistency, except root).
        if (path !== '/' && path.endsWith('/') && !url.search && !url.hash) {
            path = path.slice(0, -1);
        }

        return {isInternal: true, isExternalWeb: false, href: path + url.search + url.hash};
    } catch {
        // Non-parseable URL — keep as-is and do not treat it as a web link.
        return {isInternal: false, isExternalWeb: false, href};
    }
}
