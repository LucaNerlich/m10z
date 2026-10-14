'use client';

import {useEffect, useState} from 'react';

import {useIsMac} from '@/src/hooks/useIsMac';

import styles from './Header.module.css';
import {SearchModal} from './SearchModal';
import {SWRConfig} from 'swr';
import {swrConfig} from '@/src/lib/swr/config';

const shortcutKeySearch = 'K';

export function SearchLauncher(): React.ReactElement {
    const [isOpen, setIsOpen] = useState(false);
    const isMac = useIsMac();

    const shortcutLabel = isMac ? 'Cmd+' + shortcutKeySearch : 'Ctrl+' + shortcutKeySearch;

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target;
            // Never hijack the shortcut while the user is typing in a text
            // field (including the open search input itself).
            const isEditable =
                target instanceof HTMLElement &&
                (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

            const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === shortcutKeySearch.toLowerCase();
            if (isShortcut && !isEditable) {
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
            {/* Mount the SWR config only when the modal is open, so the global
                 fetch dedupe layer is not registered while it is unused. */}
            {isOpen ? (
                <SWRConfig value={swrConfig}>
                    <SearchModal onClose={() => setIsOpen(false)} />
                </SWRConfig>
            ) : null}
        </>
    );
}


