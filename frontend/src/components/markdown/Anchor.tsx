import React from 'react';
import Link from 'next/link';
import {type ExtraProps} from 'react-markdown';
import {routes} from '@/src/lib/routes';
import {resolveAnchorTarget} from '@/src/lib/markdown/anchorTarget';
import {umamiEventId, umamiExternalLinkEvent} from '@/src/lib/analytics/umami';

export type AnchorProps = React.ComponentProps<'a'> & ExtraProps & {
    'data-umami-event'?: string;
};

/** Anchor props minus the ones destructured in the component. */
type AnchorRestProps = Omit<AnchorProps, 'href' | 'children' | 'className' | 'id' | 'node'>;

// Attributes that are safe (and meaningful) to forward from a markdown link to
// the Next.js <Link> that renders it.
const FORWARDED_ANCHOR_ATTRIBUTES = new Set([
    'title',
    'download',
    'tabIndex',
    'role',
    'hrefLang',
    'ping',
    'referrerPolicy',
    'type',
]);

function isForwardableAnchorAttribute(key: string): boolean {
    return key.startsWith('aria-') || key.startsWith('data-') || FORWARDED_ANCHOR_ATTRIBUTES.has(key);
}

/**
 * Render a secure markdown link that normalizes URLs and chooses internal Next.js navigation or a safe external anchor.
 *
 * Normalizes hrefs, treats same-origin paths as internal (rendered with Next.js Link), preserves anchor and non-parseable schemes, and adds security attributes (`target="_blank"`, `rel="noopener noreferrer"`) for external destinations. For internal paths, ensures a consistent pathname (leading slash, removes trailing slash except for root) before passing to Next.js Link. For anchor links (href starting with `#`) and non-parseable URLs, the original href is preserved.
 *
 * @returns A React element — either a Next.js `Link` configured for internal navigation or an `<a>` element configured for external/anchor targets.
 */
// react-markdown passes its internal hast `node`; drop it so it never reaches the DOM.
export function Anchor({href, children, className, id, node: _node, ...props}: AnchorProps) {
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
        const existingUmamiEvent = props['data-umami-event'];
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

    // Secure same-site detection by URL origin comparison. Parsing every href —
    // including ones that merely start with "/" — prevents protocol-relative,
    // backslash-normalised ("/\host"), case, and subdomain tricks from being
    // treated as internal.
    const {isInternal, href: processedHref} = resolveAnchorTarget(href, routes.siteUrl);

    const linkProps: React.ComponentProps<typeof Link> & {'data-umami-event'?: string} = {
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
    const existingUmamiEvent = props['data-umami-event'];
    if (existingUmamiEvent == null) {
        if (!isInternal) {
            linkProps['data-umami-event'] = umamiExternalLinkEvent(processedHref, 'outbound');
        }
    }

    // Forward only anchor-safe attributes; Link passes them to the underlying <a>.
    const forwardedProps = Object.fromEntries(
        Object.keys(props)
            .filter(isForwardableAnchorAttribute)
            .map((key) => [key, props[key as keyof AnchorRestProps]]),
    ) as Partial<AnchorProps>;

    return <Link {...linkProps} {...forwardedProps}>{children}</Link>;
}
