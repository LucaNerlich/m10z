/**
 * Blocking script that initializes theme before React hydration.
 * This script runs synchronously before React loads to prevent FOUC.
 * The theme logic is duplicated here for the blocking script; ThemeSelector component
 * uses the centralized implementation from src/lib/theme/initTheme.ts.
 */
(function() {
    try {
        const stored = localStorage.getItem('m10z-theme');
        const theme = stored && ['system', 'light', 'night', 'dark', 'paper', 'hacker'].includes(stored) ? stored : 'system';
        let effectiveTheme;

        if (theme === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
            effectiveTheme = theme;
        }

        document.documentElement.dataset.theme = effectiveTheme;
    } catch (e) {
        // Fallback to system preference if localStorage fails
        document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
})();
