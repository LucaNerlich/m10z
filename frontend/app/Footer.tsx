import styles from './Footer.module.css';
import Link from 'next/link';

import {routes} from '@/src/lib/routes';

const BUILD_YEAR = new Date().getUTCFullYear();

const legalLinks = [
    {label: 'Impressum', href: routes.imprint},
    {label: 'Datenschutz', href: routes.privacy},
];

const resourceLinks = [
    {label: 'Audio Feed', href: routes.audioFeed},
    {label: 'Article Feed', href: routes.articleFeed},
    {label: 'Forum', href: routes.forum, external: true},
    {label: 'Discord', href: routes.discord, external: true},
];

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.content}>
                <div className={styles.section}>
                    <p className={styles.sectionTitle}>Rechtliches</p>
                    <ul className={styles.linkList}>
                        {legalLinks.map((link) => (
                            <li key={link.href}>
                                <Link className={styles.link} href={link.href}>
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className={styles.section}>
                    <p className={styles.sectionTitle}>Links</p>
                    <ul className={styles.linkList}>
                        {resourceLinks.map((link) => (
                            <li key={link.href}>
                                {link.external ? (
                                    <a
                                        className={styles.link}
                                        href={link.href}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                    >
                                        {link.label}
                                    </a>
                                ) : (
                                    <Link className={styles.link} href={link.href}>
                                        {link.label}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <p className={styles.meta}>© {BUILD_YEAR} m10z</p>
        </footer>
    );
}
