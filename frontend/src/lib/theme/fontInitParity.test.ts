import {readFileSync} from 'node:fs';

import {describe, expect, test} from 'vitest';

import {FONT_OPTIONS} from '@/src/components/FontPicker';

const script = readFileSync(new URL('../../../public/theme-init.js', import.meta.url), 'utf8');

describe('theme-init font parity', () => {
    test('mirrors FONT_OPTIONS id → CSS variable pairs', () => {
        const block = /const fontVariables = \{([\s\S]*?)\};/.exec(script)?.[1] ?? '';
        const pairs = Object.fromEntries(
            [...block.matchAll(/(\w+):\s*'([^']+)'/g)].map(([, id, variable]) => [id, variable]),
        );
        const expected = Object.fromEntries(
            FONT_OPTIONS.map(({id, cssVariable}) => [id, cssVariable]),
        );

        expect(pairs).toEqual(expected);
    });

    test('reads the same storage key as the picker', () => {
        expect(script).toContain("'m10z-font-family'");
        expect(script).toContain("setProperty('--font-family'");
    });
});
