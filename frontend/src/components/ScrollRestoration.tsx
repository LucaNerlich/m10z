'use client';

import {usePathname} from 'next/navigation';
import {useEffect} from 'react';

/**
 * Restores scroll to the top of the page whenever the current route changes.
 *
 * The `scroll-padding-top` CSS property on `html` handles any offset for anchor links.
 *
 * @returns The component's rendered element (`null` — renders nothing).
 */
export function ScrollRestoration(): null {
    const pathname = usePathname();

    useEffect(() => {
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
