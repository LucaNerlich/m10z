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

    // For in-page anchors (href starting with "#"), render a plain <a>.
    // Using Next.js <Link> for hash-only navigation can cause scroll-to-top behavior
    // and prevents native "jump to element" scrolling (e.g. GFM footnotes).
    if (href.startsWith('#')) {
        const existingUmamiEvent = (props as Record<string, unknown>)['data-umami-event'];
        const umamiProps =
            existingUmamiEvent == null
                ? {'data-umami-event': umamiEventId(['anchor', href.replace(/^#/, '') || 'link'])}
                : {};

        return (
            <a href={href} className={className} id={id} {...umamiProps} {...props}>
                {children}
            </a>
        );
    }

    // Secure same-site detection using URL origin comparison
    // This prevents protocol/case/trailing-slash/subdomain/protocol-relative URL attacks
    let processedHref = href;
    let isInternal = false;

    const siteOrigin = (() => {
        try {
            return new URL(routes.siteUrl).origin;
        } catch {
            return routes.siteUrl;
        }
    })();

    if (href.startsWith('/') && !href.startsWith('//')) {
        isInternal = true;
        // Normalize trailing slash (remove for consistency, except root)
        if (href !== '/' && href.endsWith('/') && !href.includes('?') && !href.includes('#')) {
            processedHref = href.slice(0, -1);
        } else {
            processedHref = href;
        }
    } else {
        try {
            // Protocol-relative URLs ("//host/path") have no scheme; give them https: so they parse.
            const baseUrl = href.startsWith('//') ? `https:${href}` : href;
            const url = new URL(baseUrl, routes.siteUrl);

            isInternal = url.origin === siteOrigin;

            if (isInternal) {
                processedHref = url.pathname + url.search + url.hash;
                if (!processedHref || processedHref === '/') {
                    processedHref = '/';
                } else if (!processedHref.startsWith('/')) {
                    processedHref = '/' + processedHref;
                }
            } else {
                processedHref = href;
            }
        } catch {
            // Non-parseable URL (e.g., mailto:, tel:, javascript:) — keep as external.
            isInternal = false;
            processedHref = href;
        }
    }

    const linkProps: React.ComponentProps<typeof Link> & Record<string, unknown> = {
        href: processedHref,
    };

    if (className) {
        linkProps.className = className;
    }

    if (id) {
        linkProps.id = id;
    }

    // External links open in a new tab; anchors keep in-page behaviour.
    if (!isInternal) {
        linkProps.target = '_blank';
        linkProps.rel = 'noopener noreferrer';
    }

    // Add Umami events for non-page links (external), unless explicitly provided.
    const existingUmamiEvent = (props as Record<string, unknown>)['data-umami-event'];
    if (existingUmamiEvent == null) {
        if (!isInternal) {
            linkProps['data-umami-event'] = umamiExternalLinkEvent(processedHref, 'outbound');
        }
    }

    // Forward only anchor-safe attributes; Link passes them to the underlying <a>.
    Object.keys(props).forEach((key) => {
        const value = (props as Record<string, unknown>)[key];
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
