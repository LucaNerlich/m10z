import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {describe, expect, test} from 'vitest';

/**
 * The design tokens are layered: `colors.css` holds the raw palette and
 * `theme.css` re-maps `--color-*`/`--code-*` per theme via `var(...)`. A *literal*
 * value therefore belongs to exactly one stylesheet — duplicating one across files
 * lets the copies drift, and the drift is invisible because whichever file loads
 * later wins.
 *
 * Added after `--code-*-night` was found declared byte-identically in both
 * `colors.css` and `theme.css`.
 *
 * Deliberately not asserted here (they would be false positives):
 * - a token declared several times *within* one file — that is how the theme blocks
 *   (`:root`, `[data-theme=…]`, the dark media query) override each other;
 * - a token declared in two files with `var(...)` — that is the alias layer.
 */

const STYLES_DIR = join(process.cwd(), 'src/styles');

function stylesheets(): string[] {
    return readdirSync(STYLES_DIR)
        .filter((name) => name.endsWith('.css'))
        .sort();
}

/** Last literal-valued declaration per token (later declarations win, as CSS does). */
function literalTokens(file: string): Map<string, string> {
    const source = readFileSync(join(STYLES_DIR, file), 'utf8');
    const found = new Map<string, string>();

    for (const [, token, value] of source.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
        const normalized = value.trim().replace(/\s+/g, ' ');
        if (normalized.includes('var(')) continue;
        found.set(token, normalized);
    }

    return found;
}

describe('style token hygiene', () => {
    test('a token with a literal value is declared in exactly one stylesheet', () => {
        const owners = new Map<string, string[]>();

        for (const file of stylesheets()) {
            for (const token of literalTokens(file).keys()) {
                owners.set(token, [...(owners.get(token) ?? []), file]);
            }
        }

        const duplicated = [...owners.entries()]
            .filter(([, files]) => files.length > 1)
            .map(([token, files]) => `${token}: ${files.join(', ')}`);

        expect(duplicated, 'the same literal palette value is declared in several stylesheets').toEqual(
            [],
        );
    });

    test('the guard would catch the duplication it was added for', () => {
        // Sanity check on the rule itself: the removed duplication was a literal in
        // two files, so it would be reported by the assertion above.
        const owners = new Map<string, string[]>();
        owners.set('--code-bg-night', ['colors.css', 'theme.css']);
        const duplicated = [...owners.entries()]
            .filter(([, files]) => files.length > 1)
            .map(([token, files]) => `${token}: ${files.join(', ')}`);

        expect(duplicated).toContain('--code-bg-night: colors.css, theme.css');
    });
});
