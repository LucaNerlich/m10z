'use client';

import {usePathname} from 'next/navigation';
import {useEffect} from 'react';

/**
 * Scroll restoration component that scrolls to the top of the page when the route changes.
 * The scroll-padding-top CSS property on html handles the offset for anchor links.
 */
export function ScrollRestoration(): null {
    const pathname = usePathname();

    useEffect(() => {
        // Scroll to top when route changes
        window.scrollTo({
            top: 0,
            behavior: 'instant',
        });
    }, [pathname]);

    return null;
}

