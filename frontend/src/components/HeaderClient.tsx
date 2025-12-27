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
    const burgerButtonRef = useRef<HTMLButtonElement | null>(null);
    const prevMenuOpenRef = useRef(false);

    const closeMenu = () => setIsMenuOpen(false);

    const toggleMenu = () => setIsMenuOpen((prev) => !prev);

    const getFocusableElements = (): HTMLElement[] => {
        if (!menuRef.current) return [];
        const focusableSelectors = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const elements = menuRef.current.querySelectorAll<HTMLElement>(focusableSelectors);
        return Array.from(elements).filter((el) => !el.hasAttribute('disabled'));
    };

    const handleBurgerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            toggleMenu();
        }
    };

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

    useEffect(() => {
        if (!isMenuOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeMenu();
                return;
            }

            if (event.key === 'Tab' && menuRef.current?.contains(document.activeElement)) {
                const focusableElements = getFocusableElements();
                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (event.shiftKey) {
                    // Shift+Tab: backward
                    if (document.activeElement === firstElement) {
                        event.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    // Tab: forward
                    if (document.activeElement === lastElement) {
                        event.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMenuOpen]);

    useEffect(() => {
        if (isMenuOpen) {
            // Focus first link when menu opens
            setTimeout(() => {
                const firstFocusable = menuRef.current?.querySelector<HTMLElement>('a, button');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            }, 0);
        } else if (prevMenuOpenRef.current) {
            // Restore focus to burger button when menu closes (only if it was previously open)
            if (burgerButtonRef.current) {
                burgerButtonRef.current.focus();
            }
        }
        prevMenuOpenRef.current = isMenuOpen;
    }, [isMenuOpen]);

    return (
        <div style={{display: 'flex'}} ref={menuRef}>
            <button
                ref={burgerButtonRef}
                type="button"
                className={`${styles.burgerButton} ${isMenuOpen ? styles.burgerButtonActive : ''}`}
                aria-expanded={isMenuOpen}
                aria-controls="header-menu"
                aria-label="Menü öffnen"
                onClick={toggleMenu}
                onKeyDown={handleBurgerKeyDown}
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

