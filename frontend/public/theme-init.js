(function() {
    try {
        var stored = localStorage.getItem('m10z-theme');
        var theme = stored && ['system', 'light', 'dark', 'grey'].includes(stored) ? stored : 'system';
        var effectiveTheme;
        
        if (theme === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
            effectiveTheme = theme;
        }
        
        document.documentElement.dataset.theme = effectiveTheme;
    } catch (e) {
        // Fallback to system preference if localStorage fails
        var effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.documentElement.dataset.theme = effectiveTheme;
    }
})();

