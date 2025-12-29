(function() {
    try {
        const stored = localStorage.getItem('m10z-theme');
        const theme = stored && ['system', 'light', 'dark', 'grey', 'paper'].includes(stored) ? stored : 'system';
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

