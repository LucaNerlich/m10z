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
    // The pathname a popstate navigation landed on. A popstate that does *not*
    // change the pathname (an in-page or hash-only back) must not leave a
    // boolean flag armed, or the next genuine route change would skip its scroll
    // reset. Comparing the recorded path against the current one scopes the skip
    // to the navigation it belongs to.
    const popStatePath = useRef<string | null>(null);

    useEffect(() => {
        const onPopState = () => {
            popStatePath.current = window.location.pathname;
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    useEffect(() => {
        if (popStatePath.current === pathname) {
            popStatePath.current = null;
            return;
        }
        if (window.location.hash) {
            return;
        }
        // rAF defers scrolling until after the browser paint cycle, so the sticky
        // header's position is recalculated correctly after the new page DOM renders.
        requestAnimationFrame(() => {
            window.scrollTo({
                top: 0,
                behavior: 'instant',
            });
        });
    }, [pathname]);

    return null;
}
