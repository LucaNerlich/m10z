/**
 * Theme initialization utility.
 * Used by ThemeSelector component for theme management.
 * The blocking script in public/theme-init.js contains its own implementation for FOUC prevention.
 */

export const STORAGE_KEY = 'm10z-theme';

export type Theme = 'system' | 'light' | 'night' | 'dark' | 'paper' | 'hacker';
export type EffectiveTheme = 'light' | 'night' | 'dark' | 'paper' | 'hacker';

const THEME_OPTIONS: Theme[] = ['system', 'light', 'night', 'dark', 'paper', 'hacker'];

export function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveEffectiveTheme(theme: Theme): EffectiveTheme {
    if (theme === 'system') {
        return getSystemTheme();
    }
    return theme;
}

export function getStoredTheme(): Theme {
    if (typeof window === 'undefined' || !window.localStorage) {
        return 'system';
    }
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return stored && THEME_OPTIONS.includes(stored as Theme) ? (stored as Theme) : 'system';
    } catch {
        return 'system';
    }
}

export function applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = resolveEffectiveTheme(theme);
}

