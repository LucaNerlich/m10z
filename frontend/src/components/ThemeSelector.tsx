'use client';

import React, {useEffect, useState} from 'react';

import styles from './ThemeSelector.module.css';

const STORAGE_KEY = 'm10z-theme';

type Theme = 'system' | 'light' | 'dark' | 'grey';
type EffectiveTheme = 'light' | 'dark' | 'grey';

interface ThemeOption {
    id: Theme;
    displayName: string;
}

const THEME_OPTIONS: ThemeOption[] = [
    {id: 'system', displayName: 'System'},
    {id: 'light', displayName: 'Light'},
    {id: 'dark', displayName: 'Dark'},
    {id: 'grey', displayName: 'Grey'},
];

const DEFAULT_THEME: Theme = 'system';

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveEffectiveTheme(theme: Theme): EffectiveTheme {
    if (theme === 'system') {
        return getSystemTheme();
    }
    return theme;
}

function applyTheme(theme: Theme) {
    if (typeof document === 'undefined') return;
    const effectiveTheme = resolveEffectiveTheme(theme);
    document.documentElement.dataset.theme = effectiveTheme;
}

export default function ThemeSelector(): React.ReactElement | null {
    const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        let stored: string | null = null;
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                stored = window.localStorage.getItem(STORAGE_KEY);
            } catch (error) {
                console.warn('Failed to read theme preference from localStorage:', error);
                stored = null;
            }
        }
        const initial: Theme =
            stored && THEME_OPTIONS.some((option) => option.id === stored) ? (stored as Theme) : DEFAULT_THEME;
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

