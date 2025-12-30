import React from 'react';
import Link from 'next/link';
import {routes} from '@/src/lib/routes';

export type AnchorProps = React.ComponentProps<'a'>;

/**
 * Anchor component for markdown content with secure link handling.
 * 
 * Features:
 * - Detects internal vs external links using secure origin comparison
 * - Uses Next.js Link for internal navigation
 * - Adds security attributes (target, rel) for external links
 * - Normalizes URLs for consistency
 * - Handles anchor links, relative paths, and absolute URLs securely
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

