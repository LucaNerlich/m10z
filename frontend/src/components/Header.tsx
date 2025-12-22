import Image from 'next/image';
import Link from 'next/link';
import React, {Suspense} from 'react';

import HeaderClient from './HeaderClient';
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
] as const;

export default function Header(): React.ReactElement {
    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link className={styles.logo} href={routes.home} aria-label="Zur Startseite">
                    <Image
                        src="/logo.svg"
                        alt="m10z"
                        width={100}
                        height={38}
                        priority
                    />
                </Link>

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
