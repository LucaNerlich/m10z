'use client';

import {usePathname} from 'next/navigation';
import {useEffect, useRef} from 'react';

/**
 * Restores scroll to the top of the page whenever the current route changes.
 *
 * Back/forward navigations (popstate) are skipped: the browser/App Router
 * restores the previous scroll position natively, and scrolling to top would
 * override it. Deep links with a `#hash` are skipped too — the browser scrolls
 * to the anchor, which must not be cancelled.
 *
 * The `scroll-padding-top` CSS property on `html` handles any offset for anchor links.
 *
 * @returns The component's rendered element (`null` — renders nothing).
 */
export function ScrollRestoration(): null {
    const pathname = usePathname();
    const popStateSeen = useRef(false);

    useEffect(() => {
        const onPopState = () => {
            popStateSeen.current = true;
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    useEffect(() => {
        if (popStateSeen.current) {
            popStateSeen.current = false;
            return;
        }
        if (window.location.hash) {
            return;
        }
        // Scroll to top when route changes
        // Use requestAnimationFrame to defer scrolling until after the browser paint cycle
        // This ensures the sticky header's position is recalculated correctly after the new page DOM is rendered
        requestAnimationFrame(() => {
            window.scrollTo({
                top: 0,
                behavior: 'instant',
            });
        });
    }, [pathname]);

    return null;
}
