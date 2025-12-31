'use client';

import {useEffect, useState} from 'react';

import styles from './Header.module.css';
import {SearchModal} from './SearchModal';

const shortcutKeySearch = 'K';

export function SearchLauncher(): React.ReactElement {
    const [isOpen, setIsOpen] = useState(false);
    const [isMac, setIsMac] = useState(false);

    useEffect(() => {
        setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
    }, []);

    const shortcutLabel = isMac ? 'Cmd+' + shortcutKeySearch : 'Ctrl+' + shortcutKeySearch;

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === shortcutKeySearch.toLowerCase();
            if (isShortcut) {
                event.preventDefault();
                setIsOpen((prev) => !prev);
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
                <span className={styles.searchShortcut}>{shortcutLabel}</span>
            </button>
            {isOpen ? <SearchModal onClose={() => setIsOpen(false)} /> : null}
        </>
    );
}


