import {describe, expect, test} from 'vitest';

import {requireNonEmpty} from './requireNonEmpty';

describe('requireNonEmpty', () => {
    test('throws when every count is zero', () => {
        expect(() => requireNonEmpty({articles: 0, podcasts: 0}, 'statistik snapshot')).toThrow(
            /refusing to overwrite/,
        );
    });

    test('passes when at least one count is non-zero', () => {
        expect(() => requireNonEmpty({articles: 0, podcasts: 3}, 'statistik snapshot')).not.toThrow();
    });

    test('passes for a single non-empty collection', () => {
        expect(() => requireNonEmpty({entries: 523}, 'media index')).not.toThrow();
    });
});
