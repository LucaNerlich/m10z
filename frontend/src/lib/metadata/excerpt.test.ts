import {describe, expect, test} from 'vitest';

import {deriveContentDescription, deriveExcerpt} from './excerpt';

describe('deriveExcerpt', () => {
    test('returns undefined for empty or whitespace-only input', () => {
        expect(deriveExcerpt(null)).toBeUndefined();
        expect(deriveExcerpt(undefined)).toBeUndefined();
        expect(deriveExcerpt('')).toBeUndefined();
        expect(deriveExcerpt('   \n  ')).toBeUndefined();
    });

    test('strips common markdown while keeping link and code text', () => {
        expect(deriveExcerpt('# Title\n\nSome **bold** and [a link](https://x) and `code`.')).toBe(
            'Title Some bold and a link and code.',
        );
    });

    test('removes images entirely', () => {
        expect(deriveExcerpt('![alt text](https://x/y.png) caption')).toBe('caption');
    });

    test('returns short text unchanged', () => {
        expect(deriveExcerpt('Short and sweet')).toBe('Short and sweet');
    });

    test('truncates at a word boundary and appends an ellipsis', () => {
        expect(deriveExcerpt('The quick brown fox jumps over the lazy dog', 20)).toBe('The quick brown fox…');
    });

    test('never exceeds maxChars plus the ellipsis', () => {
        const result = deriveExcerpt('a'.repeat(500), 50);
        // No spaces to break on, so it hard-cuts at maxChars then adds the ellipsis.
        expect(result).toBe(`${'a'.repeat(50)}…`);
    });
});

describe('deriveContentDescription', () => {
    test('prefers the explicit description (trimmed)', () => {
        expect(deriveContentDescription('  Explicit  ', '# markdown body')).toBe('Explicit');
    });

    test('falls back to an excerpt of the markdown body', () => {
        expect(deriveContentDescription(null, '# Title\n\nBody')).toBe('Title Body');
        expect(deriveContentDescription('   ', 'Body')).toBe('Body');
    });

    test('returns undefined when both inputs are empty', () => {
        expect(deriveContentDescription(undefined, undefined)).toBeUndefined();
        expect(deriveContentDescription('', '')).toBeUndefined();
    });
});
