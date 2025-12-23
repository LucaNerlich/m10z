'use client';

import {useEffect, useState} from 'react';

import styles from './Header.module.css';
import {SearchModal} from './SearchModal';

export function SearchLauncher(): React.ReactElement {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
            if (isShortcut) {
                event.preventDefault();
                setIsOpen(true);
            } else if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <>
            <button
                type="button"
                className={styles.searchButton}
                onClick={() => setIsOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <span className={styles.searchButtonLabel}>Suche</span>
                <span className={styles.searchShortcut}>Cmd+K</span>
            </button>
            {isOpen ? <SearchModal onClose={() => setIsOpen(false)} /> : null}
        </>
    );
}


