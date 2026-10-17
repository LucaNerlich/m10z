'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import React from 'react';

import {routes} from '@/src/lib/routes';
import styles from './Header.module.css';

interface LogoClientProps {
    className?: string;
}

/**
 * Render a logo link that scrolls smoothly to the top when clicked on the home route without query parameters, otherwise navigates to the home page.
 *
 * @param className - Optional CSS class name applied to the link; defaults to the component's logo style when omitted
 * @returns A React element containing the logo wrapped in a link to the home route
 */
export default function LogoClient({className}: LogoClientProps): React.ReactElement {
    const pathname = usePathname();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Read the platform value at click time (a bare `?` counts as empty, same as
        // `searchParams.size === 0`); using the hook here would only buy a Suspense
        // boundary and a duplicated logo fallback.
        const search = window.location.search.replace('?', '');
        if (pathname === routes.home && search === '') {
            e.preventDefault();
            window.scrollTo({top: 0, behavior: 'smooth'});
        }
        // Otherwise, allow default Link navigation
    };

    return (
        <Link
            className={className ?? styles.logo}
            href={routes.home}
            aria-label="Zur Startseite"
            onClick={handleClick}
        >
            <Image
                src="/logo.svg"
                alt="m10z"
                width={100}
                height={38}
                priority
            />
        </Link>
    );
}
