import styles from './Footer.module.css';
import Link from 'next/link';

import FontPicker from './FontPicker';
import ThemeSelector from './ThemeSelector';
import {routes} from '@/src/lib/routes';
import {umamiEventId} from '@/src/lib/analytics/umami';

type FooterLink = {label: string; href: string; external?: boolean};
type FooterSection = {title: string; links: FooterLink[]};

const sections: FooterSection[] = [
    {
        title: 'Inhalte',
        links: [
            {label: 'Artikel', href: routes.articles},
            {label: 'Podcasts', href: routes.podcasts},
            {label: 'Kategorien & Formate', href: routes.categories},
            {label: 'AutorInnen', href: routes.authors},
            {label: 'Über Uns', href: routes.about},
        ],
    },
    {
        title: 'Social Media',
        links: [
            {label: 'Forum', href: routes.forum, external: true},
            {label: 'Discord', href: routes.discord, external: true},
            {label: 'LinkTree', href: routes.linktree, external: true},
        ],
    },
    {
        title: 'Feeds',
        links: [
            {label: 'Audio-Feed', href: routes.audioFeed, external: true},
            {label: 'Artikel-Feed', href: routes.articleFeed, external: true},
            // {label: 'Erklärung', href: routes.feeds},
        ],
    },
    {
        title: 'Rechtliches',
        links: [
            {label: 'Impressum', href: routes.imprint},
            {label: 'Datenschutz', href: routes.privacy},
        ],
    },
];

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.content}>
                {sections.map((section) => (
                    <div key={section.title} className={styles.section}>
                        <h2 className={styles.sectionTitle}>{section.title}</h2>
                        <ul className={styles.linkList}>
                            {section.links.map((link) => (
                                <li key={link.href}>
                                    {link.external ? (
                                        <a
                                            className={styles.link}
                                            href={link.href}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            data-umami-event={umamiEventId(['footer', section.title, link.label])}
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
            <div className={styles.metaRow}>
                <FontPicker />
                <ThemeSelector />
            </div>
        </footer>
    );
}
