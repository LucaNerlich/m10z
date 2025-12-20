'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import React, {useEffect, useRef, useState} from 'react';

import styles from './Header.module.css';

type HeaderClientProps = {
    primaryLinks: ReadonlyArray<{label: string; href: string}>;
    secondaryLinks: ReadonlyArray<{label: string; href: string}>;
};

export default function HeaderClient({
                                         primaryLinks,
                                         secondaryLinks,
                                     }: HeaderClientProps): React.ReactElement {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();
    const menuRef = useRef<HTMLDivElement | null>(null);

    const closeMenu = () => setIsMenuOpen(false);

    useEffect(() => {
        if (!isMenuOpen) return;
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                closeMenu();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isMenuOpen]);

    useEffect(() => {
        closeMenu();
    }, [pathname]);

    return (
        <div ref={menuRef}>
            <button
                type="button"
                className={`${styles.burgerButton} ${isMenuOpen ? styles.burgerButtonActive : ''}`}
                aria-expanded={isMenuOpen}
                aria-controls="header-menu"
                aria-label="Menü öffnen"
                onClick={() => setIsMenuOpen((prev) => !prev)}
            >
                <span className={styles.burgerLines} aria-hidden>
                    <span />
                    <span />
                    <span />
                </span>
                <span className={styles.srOnly}>Menü</span>
            </button>

            <div
                id="header-menu"
                className={`${styles.menu} ${isMenuOpen ? styles.menuOpen : ''}`}
                role="menu"
            >
                <nav aria-label="Weitere Navigation">
                    <ul className={styles.menuList}>
                        {primaryLinks.map((link) => (
                            <li key={link.href} className={styles.mobileOnly}>
                                <Link className={styles.menuLink} href={link.href} onClick={closeMenu}>
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                        {secondaryLinks.map((link) => (
                            <li key={link.href}>
                                <Link className={styles.menuLink} href={link.href} onClick={closeMenu}>
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </div>
    );
}

