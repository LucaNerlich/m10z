/**
 * Blocking script that initializes theme and the chosen font before React
 * hydration, so neither flashes on first paint. The theme logic is duplicated
 * here for the blocking script; ThemeSelector uses the centralized
 * implementation from src/lib/theme/initTheme.ts.
 *
 * The font map mirrors FONT_OPTIONS in src/components/FontPicker.tsx — keep the
 * ids and CSS variables in sync when adding a font.
 */
(function() {
    try {
        const stored = localStorage.getItem('m10z-theme');
        const theme = stored && ['system', 'light', 'night', 'dark', 'paper', 'hacker', 'rainbow', 'oled'].includes(stored) ? stored : 'system';
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

    try {
        const fontVariables = {
            argon: 'var(--font-argon-family)',
            krypton: 'var(--font-krypton-family)',
            neon: 'var(--font-neon-family)',
            poppins: 'var(--font-poppins-family)',
            radon: 'var(--font-radon-family)',
            xenon: 'var(--font-xenon-family)'
        };
        const storedFont = localStorage.getItem('m10z-font-family');
        if (storedFont && Object.prototype.hasOwnProperty.call(fontVariables, storedFont)) {
            document.documentElement.style.setProperty('--font-family', fontVariables[storedFont]);
        }
    } catch (e) {
        // Keep the typography default when storage is unavailable.
    }
})();
