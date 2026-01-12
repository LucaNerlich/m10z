import Link from 'next/link';
import styles from './AuthorNav.module.css';

export type AuthorSection = 'overview' | 'artikel' | 'podcasts';

type AuthorNavProps = {
    authorSlug: string;
    activeSection: AuthorSection;
};

export function AuthorNav({authorSlug, activeSection}: AuthorNavProps) {
    const links: Array<{label: string; href: string; section: AuthorSection}> = [
        {label: 'Übersicht', href: `/team/${authorSlug}`, section: 'overview'},
        {label: 'Artikel', href: `/team/${authorSlug}/artikel`, section: 'artikel'},
        {label: 'Podcasts', href: `/team/${authorSlug}/podcasts`, section: 'podcasts'},
    ];

    return (
        <nav className={styles.nav} aria-label="Autor Navigation">
            <div className={styles.inner}>
                {links.map((link) => {
                    const isActive = link.section === activeSection;
                    const className = [styles.link, isActive ? styles.linkActive : null].filter(Boolean).join(' ');
                    return (
                        <Link
                            key={link.section}
                            href={link.href}
                            className={className}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {link.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}


