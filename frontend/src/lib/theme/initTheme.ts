/**
 * Theme initialization utility.
 * Used both by the blocking script (for FOUC prevention) and ThemeSelector component.
 */

export const STORAGE_KEY = 'm10z-theme';

export type Theme = 'system' | 'light' | 'dark' | 'grey' | 'paper' | 'hacker';
export type EffectiveTheme = 'light' | 'dark' | 'grey' | 'paper' | 'hacker';

const THEME_OPTIONS: Theme[] = ['system', 'light', 'dark', 'grey', 'paper', 'hacker'];

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

/**
 * Initialize theme from localStorage or system preference.
 * This is the function used by the blocking script.
 */
export function initTheme(): void {
    try {
        const theme = getStoredTheme();
        applyTheme(theme);
    } catch {
        // Fallback to system preference if anything fails
        const effectiveTheme = getSystemTheme();
        if (typeof document !== 'undefined') {
            document.documentElement.dataset.theme = effectiveTheme;
        }
    }
}

