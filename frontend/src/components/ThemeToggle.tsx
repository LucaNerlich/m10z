'use client';

import React, {useEffect, useState} from 'react';

import styles from './ThemeToggle.module.css';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'm10z-theme';

function getSystemTheme(): Theme {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = theme;
}

export default function ThemeToggle(): React.ReactElement {
    const [theme, setTheme] = useState<Theme>('light');
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
        const initial = stored === 'light' || stored === 'dark' ? stored : getSystemTheme();
        setTheme(initial);
        applyTheme(initial);
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        applyTheme(theme);
        window.localStorage.setItem(STORAGE_KEY, theme);
    }, [theme, hydrated]);

    const toggle = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

    const label = theme === 'dark' ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren';
    const text = theme === 'dark' ? 'Dunkel' : 'Hell';
    const icon = theme === 'dark' ? '🌙' : '☀️';

    return (
        <button type="button" className={styles.toggle} onClick={toggle} aria-label={label}>
            <span className={styles.icon} aria-hidden>
                {icon}
            </span>
            <span className={styles.label}>{text}</span>
        </button>
    );
}

