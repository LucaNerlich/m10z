'use client';

import {useEffect, useState, useSyncExternalStore} from 'react';

import styles from './Header.module.css';
import {SearchModal} from './SearchModal';
import {SWRProvider} from './SWRProvider';

const shortcutKeySearch = 'K';

// Hoist RegExp pattern to module scope
const REGEX_APPLE_PLATFORM = /Mac|iPhone|iPad|iPod/;

const subscribeNoop = () => () => {
};
const getIsMac = () => REGEX_APPLE_PLATFORM.test(navigator.platform);
const getIsMacServer = () => false;

export function SearchLauncher(): React.ReactElement {
    const [isOpen, setIsOpen] = useState(false);
    const isMac = useSyncExternalStore(subscribeNoop, getIsMac, getIsMacServer);

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
            {/* Mount SWRProvider only when modal is open to avoid registering
                 the global SWR config and fetch dedupe layer when unused. */}
            {isOpen ? (
                <SWRProvider>
                    <SearchModal onClose={() => setIsOpen(false)} />
                </SWRProvider>
            ) : null}
        </>
    );
}


