'use client';

import React, {useEffect, useState} from 'react';

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

export default function ThemeSelector(): React.ReactElement | null {
    const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const initial = getStoredTheme();
        setTheme(initial);
        applyTheme(initial);
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        applyTheme(theme);

        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                window.localStorage.setItem(STORAGE_KEY, theme);
            } catch (error) {
                console.warn('Failed to save theme preference to localStorage:', error);
            }
        }
    }, [theme, hydrated]);

    useEffect(() => {
        if (!hydrated || theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            applyTheme('system');
        };

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
        // Fallback for older browsers
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
    }, [theme, hydrated]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setTheme(e.target.value as Theme);
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

