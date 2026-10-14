'use client';

import React, {useEffect} from 'react';

import {applyTheme, getStoredTheme, persistTheme, subscribeToTheme, type Theme} from '@/src/lib/theme/initTheme';
import {useStoredPreference} from '@/src/hooks/useStoredPreference';

import {PreferenceSelect} from './PreferenceSelect';
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
const getServerTheme = () => DEFAULT_THEME;

export default function ThemeSelector(): React.ReactElement | null {
    // subscribeToTheme keeps the snapshot in sync with the header toggle and
    // cross-tab changes; a no-op subscription would show a stale theme.
    const {value: theme, setValue, hydrated} = useStoredPreference<Theme>({
        subscribe: subscribeToTheme,
        getStored: getStoredTheme,
        getServerValue: getServerTheme,
        apply: applyTheme,
        persist: persistTheme,
    });

    useEffect(() => {
        if (!hydrated || theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            applyTheme('system');
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme, hydrated]);

    if (!hydrated) {
        return null;
    }

    return (
        <PreferenceSelect
            options={THEME_OPTIONS}
            value={theme}
            onChange={(value) => setValue(value as Theme)}
            ariaLabel="Design auswählen"
            wrapperClassName={styles.pickerWrapper}
            selectClassName={styles.picker}
        />
    );
}
