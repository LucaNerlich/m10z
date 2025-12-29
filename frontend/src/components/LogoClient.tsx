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
 * Client-side logo component that scrolls to top when clicked on home page,
 * otherwise navigates normally to the home route.
 *
 * @param className - Optional CSS class name to apply to the logo link
 * @returns The logo link element as a React element
 */
export default function LogoClient({className}: LogoClientProps): React.ReactElement {
    const pathname = usePathname();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (pathname === routes.home) {
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

