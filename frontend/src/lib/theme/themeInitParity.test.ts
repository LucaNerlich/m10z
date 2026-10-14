import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {describe, expect, test} from 'vitest';

import {THEME_OPTIONS, type Theme} from './initTheme';

/**
 * The blocking pre-hydration script in `public/theme-init.js` must accept exactly
 * the themes the app supports: it cannot import the list (it runs before any
 * bundle), and a theme missing from it is ignored until React hydrates - the
 * flash of the system theme the script exists to prevent.
 */
describe('theme list parity', () => {
    test('public/theme-init.js accepts exactly the supported themes', () => {
        const script = readFileSync(join(process.cwd(), 'public/theme-init.js'), 'utf8');

        const match = script.match(/\[([^\]]*)\]\s*\.includes\s*\(/);
        expect(match, 'no theme whitelist found in public/theme-init.js').not.toBeNull();

        const scriptThemes = match![1]
            .split(',')
            .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ''))
            .filter(Boolean);

        expect(scriptThemes).toEqual([...THEME_OPTIONS]);
    });

    test('the app list has no duplicates', () => {
        const unique = new Set<Theme>(THEME_OPTIONS);
        expect(unique.size).toBe(THEME_OPTIONS.length);
    });
});
