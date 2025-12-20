import styles from './Footer.module.css';
import Link from 'next/link';

import {routes} from '@/src/lib/routes';

const BUILD_YEAR = new Date().getUTCFullYear();

type FooterLink = {label: string; href: string; external?: boolean};
type FooterSection = {title: string; links: FooterLink[]};

const sections: FooterSection[] = [
    {
        title: 'Inhalte',
        links: [
            {label: 'Artikel', href: routes.articles},
            {label: 'Podcasts', href: routes.podcasts},
            {label: 'Kategorien', href: routes.categories},
        ],
    },
    {
        title: 'Feeds',
        links: [
            {label: 'Audio Feed', href: routes.audioFeed, external: true},
            {label: 'Article Feed', href: routes.articleFeed, external: true},
        ],
    },
    {
        title: 'Rechtliches',
        links: [
            {label: 'Impressum', href: routes.imprint},
            {label: 'Datenschutz', href: routes.privacy},
        ],
    },
    {
        title: 'Social Media',
        links: [
            {label: 'Forum', href: routes.forum, external: true},
            {label: 'Discord', href: routes.discord, external: true},
        ],
    },
];

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.content}>
                {sections.map((section) => (
                    <div key={section.title} className={styles.section}>
                        <p className={styles.sectionTitle}>{section.title}</p>
                        <ul className={styles.linkList}>
                            {section.links.map((link) => (
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
                ))}
            </div>
            <p className={styles.meta}>© {BUILD_YEAR} m10z</p>
        </footer>
    );
}
