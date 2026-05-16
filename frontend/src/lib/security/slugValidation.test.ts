import {describe, expect, test} from 'vitest';

import {validateSlug, validateSlugSafe} from './slugValidation';

describe('validateSlug — valid inputs', () => {
    test.each([
        'simple',
        'with-hyphen',
        'with_underscore',
        'mixed-Case123',
        'a',
        'a'.repeat(255),
    ])('"%s" passes through', (slug) => {
        expect(validateSlug(slug)).toBe(slug.trim());
    });

    test('trims surrounding whitespace', () => {
        expect(validateSlug('  hello-world  ')).toBe('hello-world');
    });
});

describe('validateSlug — invalid inputs', () => {
    test('null → throws "required"', () => {
        expect(() => validateSlug(null)).toThrow(/required/);
    });

    test('undefined → throws "required"', () => {
        expect(() => validateSlug(undefined)).toThrow(/required/);
    });

    test('empty string → throws "required"', () => {
        expect(() => validateSlug('')).toThrow(/required/);
    });

    test('whitespace-only → throws "empty"', () => {
        expect(() => validateSlug('   ')).toThrow(/empty/);
    });

    test('over 255 chars → throws "maximum length"', () => {
        expect(() => validateSlug('a'.repeat(256))).toThrow(/maximum length/);
    });

    test.each([
        '../etc/passwd',
        'has spaces',
        'has/slashes',
        'has.dots',
        'has?query=1',
        'unicode-ümlaut',
        'newline\nin\nslug',
    ])('"%s" → throws "invalid characters"', (slug) => {
        expect(() => validateSlug(slug)).toThrow(/invalid characters/);
    });
});

describe('validateSlugSafe', () => {
    test('valid → returns slug', () => {
        expect(validateSlugSafe('valid-slug')).toBe('valid-slug');
    });

    test.each([
        null,
        undefined,
        '',
        '   ',
        '../traversal',
        'a'.repeat(300),
    ])('"%s" → null instead of throwing', (slug) => {
        expect(validateSlugSafe(slug as string | null | undefined)).toBeNull();
    });
});
