import React from 'react';
import Link from 'next/link';
import {routes} from '@/src/lib/routes';
import {umamiEventId, umamiExternalLinkEvent} from '@/src/lib/analytics/umami';

export type AnchorProps = React.ComponentProps<'a'>;

/**
 * Render a secure markdown link that normalizes URLs and chooses internal Next.js navigation or a safe external anchor.
 *
 * Normalizes hrefs, treats same-origin paths as internal (rendered with Next.js Link), preserves anchor and non-parseable schemes, and adds security attributes (`target="_blank"`, `rel="noopener noreferrer"`) for external destinations. For internal paths, ensures a consistent pathname (leading slash, removes trailing slash except for root) before passing to Next.js Link. For anchor links (href starting with `#`) and non-parseable URLs, the original href is preserved.
 *
 * @returns A React element — either a Next.js `Link` configured for internal navigation or an `<a>` element configured for external/anchor targets.
 */
export function Anchor({href, children, className, id, ...props}: AnchorProps) {
    if (!href) {
        return (
            <a href={href} className={className} id={id} {...props}>
                {children}
            </a>
        );
    }

    // Secure same-site detection using URL origin comparison
    // This prevents protocol/case/trailing-slash/subdomain/protocol-relative URL attacks
    let processedHref = href;
    let isInternal = false;
    const isAnchorLink = href.startsWith('#');

    // Get site origin for comparison (normalized, no trailing slash)
    const siteOrigin = (() => {
        try {
            return new URL(routes.siteUrl).origin;
        } catch {
            return routes.siteUrl;
        }
    })();

    // Handle anchor links (treat as external for security attributes, but keep href)
    if (isAnchorLink) {
        isInternal = false;
        processedHref = href;
    } else if (href.startsWith('/')) {
        // Relative path - treat as internal
        isInternal = true;
        // Normalize trailing slash (remove for consistency, except root)
        if (href !== '/' && href.endsWith('/') && !href.includes('?') && !href.includes('#')) {
            processedHref = href.slice(0, -1);
        } else {
            processedHref = href;
        }
    } else {
        // Absolute URL or protocol-relative - parse and compare origins
        try {
            // Use siteUrl as base for relative URLs (protocol-relative URLs like //example.com)
            const baseUrl = href.startsWith('//') ? `https:${href}` : href;
            const url = new URL(baseUrl, routes.siteUrl);

            // Compare origins securely (handles protocol, case, subdomain differences)
            const urlOrigin = url.origin;
            isInternal = urlOrigin === siteOrigin;

            if (isInternal) {
                // Same-site link - extract pathname, search, and hash
                processedHref = url.pathname + url.search + url.hash;
                // Ensure leading slash for empty paths
                if (!processedHref || processedHref === '/') {
                    processedHref = '/';
                } else if (!processedHref.startsWith('/')) {
                    processedHref = '/' + processedHref;
                }
            } else {
                // External link - keep original href
                processedHref = href;
            }
        } catch {
            // Non-parseable URL (e.g., mailto:, tel:, javascript:, etc.)
            // Keep unchanged and treat as external
            isInternal = false;
            processedHref = href;
        }
    }

    // Build props for Link component - Next.js Link forwards props to underlying <a>
    const linkProps: React.ComponentProps<typeof Link> & Record<string, unknown> = {
        href: processedHref,
    };

    // Forward className
    if (className) {
        linkProps.className = className;
    }

    // Forward id
    if (id) {
        linkProps.id = id;
    }

    // Add security attributes for external links (but not anchor links)
    if (!isInternal && !isAnchorLink) {
        linkProps.target = '_blank';
        linkProps.rel = 'noopener noreferrer';
    }

    // Add Umami events for non-page links (external + in-page anchors), unless explicitly provided.
    const existingUmamiEvent = (props as Record<string, unknown>)['data-umami-event'];
    if (existingUmamiEvent == null) {
        if (isAnchorLink) {
            linkProps['data-umami-event'] = umamiEventId(['anchor', href.replace(/^#/, '') || 'link']);
        } else if (!isInternal) {
            linkProps['data-umami-event'] = umamiExternalLinkEvent(processedHref, 'outbound');
        }
    }

    // Forward aria-* and other anchor attributes - Link will pass them to <a>
    Object.keys(props).forEach((key) => {
        const value = (props as Record<string, unknown>)[key];
        // Forward aria-*, data-*, and standard anchor attributes
        // Exclude React-specific props and events we don't want to forward
        if (
            key.startsWith('aria-') ||
            key.startsWith('data-') ||
            ['title', 'download', 'tabIndex', 'role', 'hrefLang', 'ping', 'referrerPolicy', 'type'].includes(key)
        ) {
            linkProps[key] = value;
        }
    });

    return <Link {...linkProps}>{children}</Link>;
}
