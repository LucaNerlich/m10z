/**
 * Theme initialization utility.
 * Used by ThemeSelector component for theme management.
 * The blocking script in public/theme-init.js contains its own implementation for FOUC prevention.
 */

const STORAGE_KEY = 'm10z-theme';

export type Theme = 'system' | 'light' | 'night' | 'dark' | 'paper' | 'hacker' | 'rainbow' | 'oled';
type EffectiveTheme = 'light' | 'night' | 'dark' | 'paper' | 'hacker' | 'rainbow' | 'oled';

const THEME_OPTIONS: Theme[] = ['system', 'light', 'night', 'dark', 'paper', 'hacker', 'rainbow', 'oled'];

// Fired on the same window after persistTheme() writes; the `storage` event
// only fires in OTHER tabs, so same-tab consumers need their own signal.
const THEME_CHANGE_EVENT = 'm10z-theme-change';

/**
 * Determine the current system color scheme preference.
 *
 * @returns `'dark'` if the system prefers a dark color scheme, `'light'` otherwise (`'light'` in non-browser environments).
 */
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

export function getStoredTheme(): Theme {
    if (typeof window === 'undefined') {
        return 'system';
    }
    try {
        // Accessing window.localStorage itself can throw in storage-blocked
        // browsers (e.g. Firefox with cookies disabled), so it must live
        // inside the try block.
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return stored && THEME_OPTIONS.includes(stored as Theme) ? (stored as Theme) : 'system';
    } catch {
        return 'system';
    }
}

/**
 * Subscribe to theme changes: same-tab writes (via `persistTheme`) and
 * cross-tab `storage` events. Safe to use as the `subscribe` argument of
 * `useSyncExternalStore` — without a real subscription the snapshot is never
 * re-read and controls show a stale theme.
 */
export function subscribeToTheme(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === STORAGE_KEY) callback();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(THEME_CHANGE_EVENT, callback);
    return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener(THEME_CHANGE_EVENT, callback);
    };
}

/**
 * Persist a theme selection to localStorage and notify same-tab subscribers.
 * Swallows storage errors (quota/blocked) — the in-session state still applies.
 */
export function persistTheme(theme: Theme): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
        console.warn('Failed to save theme preference to localStorage:', error);
        return;
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = resolveEffectiveTheme(theme);
}
