'use client';

import {useEffect, useState, useSyncExternalStore} from 'react';
import {SunIcon, MoonIcon} from '@phosphor-icons/react/dist/ssr';

import {
    applyTheme,
    getStoredTheme,
    resolveEffectiveTheme,
    STORAGE_KEY,
    type Theme,
} from '@/src/lib/theme/initTheme';

import styles from './ThemeToggle.module.css';

const subscribeNoop = () => () => {};
const getIsClient = () => true;
const getIsClientServer = () => false;

/**
 * Compact theme toggle for the header.
 * Cycles between light and dark themes.
 * For the full theme selector with all options, see ThemeSelector in the footer.
 */
export function ThemeToggle() {
    const storedTheme = useSyncExternalStore(subscribeNoop, getStoredTheme, () => 'system' as Theme);
    const hydrated = useSyncExternalStore(subscribeNoop, getIsClient, getIsClientServer);
    const [userTheme, setUserTheme] = useState<Theme | null>(null);
    const theme = userTheme ?? storedTheme;
    const effectiveTheme = resolveEffectiveTheme(theme);
    const isDark = effectiveTheme === 'dark' || effectiveTheme === 'night' || effectiveTheme === 'oled' || effectiveTheme === 'hacker';

    useEffect(() => {
        if (userTheme === null) return;
        applyTheme(userTheme);
        try {
            window.localStorage.setItem(STORAGE_KEY, userTheme);
        } catch {
            // Ignore localStorage errors
        }
    }, [userTheme]);

    if (!hydrated) return null;

    const toggle = () => {
        setUserTheme(isDark ? 'light' : 'dark');
    };

    return (
        <button
            type="button"
            className={styles.button}
            onClick={toggle}
            aria-label={isDark ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln'}
            data-umami-event="header-theme-toggle">
            {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>
    );
}
