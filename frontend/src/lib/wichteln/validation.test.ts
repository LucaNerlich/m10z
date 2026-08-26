import {describe, expect, test} from 'vitest';

import {validateName, validateProfileUrl, validateUniqueName} from './validation';

describe('validateName', () => {
    test('valid name returns null', () => {
        expect(validateName('Alice')).toBeNull();
    });

    test('empty string returns error', () => {
        expect(validateName('')).toBe('Name darf nicht leer sein');
    });

    test('whitespace-only returns error', () => {
        expect(validateName('   ')).toBe('Name darf nicht leer sein');
    });

    test('single character returns error', () => {
        expect(validateName('A')).toBe('Name muss mindestens 2 Zeichen lang sein');
    });

    test('very long name returns error', () => {
        expect(validateName('A'.repeat(101))).toBe(
            'Name darf maximal 100 Zeichen lang sein'
        );
    });

    test('100 characters is valid', () => {
        expect(validateName('A'.repeat(100))).toBeNull();
    });

    test('trims whitespace before validation', () => {
        expect(validateName('  Alice  ')).toBeNull();
    });
});

describe('validateProfileUrl', () => {
    test('empty string returns null (optional field)', () => {
        expect(validateProfileUrl('')).toBeNull();
    });

    test('whitespace-only returns null', () => {
        expect(validateProfileUrl('   ')).toBeNull();
    });

    test('valid steamcommunity URL returns null', () => {
        expect(validateProfileUrl('https://steamcommunity.com/id/testuser')).toBeNull();
    });

    test('valid steampowered URL returns null', () => {
        expect(validateProfileUrl('https://store.steampowered.com/app/12345')).toBeNull();
    });

    test('valid GOG URL returns null', () => {
        expect(validateProfileUrl('https://www.gog.com/u/e_Lap')).toBeNull();
    });

    test('valid GOG URL without www returns null', () => {
        expect(validateProfileUrl('https://gog.com/u/e_Lap')).toBeNull();
    });

    test('invalid URL returns error', () => {
        const result = validateProfileUrl('not-a-url');
        expect(result).toBe(
            'Bitte gib eine gültige URL ein (z.B. https://steamcommunity.com/id/... oder https://www.gog.com/u/...)'
        );
    });

    test('non-Steam/GOG URL returns error', () => {
        const result = validateProfileUrl('https://example.com/profile');
        expect(result).toBe('Bitte gib eine gültige Steam- oder GOG-URL ein');
    });

    test('rejects non-http protocols', () => {
        const result = validateProfileUrl('javascript:alert(1)');
        expect(result).toBe(
            'Bitte gib eine gültige URL ein, die mit http:// oder https:// beginnt'
        );
    });

    test('rejects ftp protocol', () => {
        const result = validateProfileUrl('ftp://steamcommunity.com/id/test');
        expect(result).toBe(
            'Bitte gib eine gültige URL ein, die mit http:// oder https:// beginnt'
        );
    });
});

describe('validateUniqueName', () => {
    test('returns null for a new unique name', () => {
        expect(validateUniqueName(['Alice', 'Bob'], 'Charlie')).toBeNull();
    });

    test('rejects an exact duplicate (case-insensitive, trimmed)', () => {
        expect(validateUniqueName(['Alice', 'Bob'], '  alice ')).toBe('Dieser Name ist bereits vergeben.');
    });

    test('returns null when the list is empty', () => {
        expect(validateUniqueName([], 'Alice')).toBeNull();
    });
});
