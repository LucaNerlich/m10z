import Image from 'next/image';
import Link from 'next/link';
import React, {Suspense} from 'react';

import HeaderClient from './HeaderClient';
import LogoClient from './LogoClient';
import {SearchLauncher} from './SearchLauncher';
import styles from './Header.module.css';
import {routes} from '@/src/lib/routes';

const primaryLinks = [
    {label: 'Artikel', href: routes.articles},
    {label: 'Podcasts', href: routes.podcasts},
] as const;

const secondaryLinks = [
    {label: 'Kategorien', href: routes.categories},
    {label: 'Team', href: routes.authors},
    {label: 'Über uns', href: routes.about},
    {label: 'RSS-Feeds', href: '/feeds'},
    {label: 'Forum 🔗', href: 'https://forum.m10z.de'},
] as const;

/**
 * Renders the site header containing the logo, centered primary navigation, search launcher, and client-side header actions.
 *
 * The primary navigation is built from `primaryLinks`. `HeaderClient` is loaded inside a `Suspense` boundary and receives
 * `primaryLinks` and `secondaryLinks`; while loading a burger-menu fallback is shown.
 *
 * @returns The header element.
 */
export default function Header(): React.ReactElement {
    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Suspense
                    fallback={
                        <Link className={styles.logo} href={routes.home} aria-label="Zur Startseite">
                            <Image
                                src="/logo.svg"
                                alt="m10z"
                                width={100}
                                height={38}
                                priority
                            />
                        </Link>
                    }
                >
                    <LogoClient className={styles.logo} />
                </Suspense>

                <nav className={styles.centerNav} aria-label="Hauptnavigation">
                    {primaryLinks.map((link) => (
                        <Link key={link.href} className={styles.navLink} href={link.href}>
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className={styles.actions}>
                    <SearchLauncher />
                    <Suspense
                        fallback={
                            <div className={styles.burgerFallback} aria-hidden>
                                <span className={styles.burgerLines}>
                                    <span />
                                    <span />
                                    <span />
                                </span>
                            </div>
                        }
                    >
                        <HeaderClient primaryLinks={primaryLinks} secondaryLinks={secondaryLinks} />
                    </Suspense>
                </div>
            </div>
        </header>
    );
}
