'use client';

import {useEffect, useState} from 'react';

import styles from './Header.module.css';
import {SearchModal} from './SearchModal';

const shortcutKeySearch = 'K';

// Hoist RegExp pattern to module scope
const REGEX_APPLE_PLATFORM = /Mac|iPhone|iPad|iPod/;

export function SearchLauncher(): React.ReactElement {
    const [isOpen, setIsOpen] = useState(false);
    const [isMac, setIsMac] = useState(false);

    useEffect(() => {
        setIsMac(REGEX_APPLE_PLATFORM.test(navigator.platform));
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
                data-umami-event="search-open"
            >
                <span className={styles.searchButtonLabel}>Suche</span>
                <span className={styles.searchShortcut}>{shortcutLabel}</span>
            </button>
            {isOpen ? <SearchModal onClose={() => setIsOpen(false)} /> : null}
        </>
    );
}


