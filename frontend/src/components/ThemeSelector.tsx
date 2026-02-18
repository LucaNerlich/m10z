'use client';

import React, {useEffect, useState, useSyncExternalStore} from 'react';

import {applyTheme, getStoredTheme, STORAGE_KEY, type Theme} from '@/src/lib/theme/initTheme';

import styles from './ThemeSelector.module.css';

interface ThemeOption {
    id: Theme;
    displayName: string;
}

const THEME_OPTIONS: ThemeOption[] = [
    {id: 'system', displayName: 'System'},
    {id: 'light', displayName: 'Light'},
    {id: 'dark', displayName: 'Dark'},
    {id: 'night', displayName: 'Night'},
    {id: 'paper', displayName: 'Paper'},
    {id: 'hacker', displayName: 'Hacker'},
    {id: 'rainbow', displayName: 'Rainbow'},
    {id: 'oled', displayName: 'OLED'},
];

const DEFAULT_THEME: Theme = 'system';
const subscribeNoop = () => () => {};
const getIsClient = () => true;
const getIsClientServer = () => false;

export default function ThemeSelector(): React.ReactElement | null {
    const storedTheme = useSyncExternalStore(subscribeNoop, getStoredTheme, () => DEFAULT_THEME);
    const [userTheme, setUserTheme] = useState<Theme | null>(null);
    const theme = userTheme ?? storedTheme;
    const hydrated = useSyncExternalStore(subscribeNoop, getIsClient, getIsClientServer);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    useEffect(() => {
        if (userTheme === null) return;

        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                window.localStorage.setItem(STORAGE_KEY, userTheme);
            } catch (error) {
                console.warn('Failed to save theme preference to localStorage:', error);
            }
        }
    }, [userTheme]);

    useEffect(() => {
        if (!hydrated || theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            applyTheme('system');
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme, hydrated]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setUserTheme(e.target.value as Theme);
    };

    if (!hydrated) {
        return null;
    }

    return (
        <div className={styles.pickerWrapper}>
            <select
                className={styles.picker}
                value={theme}
                onChange={handleChange}
                aria-label="Design auswählen"
            >
                {THEME_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.displayName}
                    </option>
                ))}
            </select>
        </div>
    );
}

