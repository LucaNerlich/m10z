import {describe, expect, test} from 'vitest';

import {validateName, validateSteamUrl, isValidHttpUrl} from './validation';

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

describe('validateSteamUrl', () => {
    test('empty string returns null (optional field)', () => {
        expect(validateSteamUrl('')).toBeNull();
    });

    test('whitespace-only returns null', () => {
        expect(validateSteamUrl('   ')).toBeNull();
    });

    test('valid steamcommunity URL returns null', () => {
        expect(validateSteamUrl('https://steamcommunity.com/id/testuser')).toBeNull();
    });

    test('valid steampowered URL returns null', () => {
        expect(validateSteamUrl('https://store.steampowered.com/app/12345')).toBeNull();
    });

    test('invalid URL returns error', () => {
        const result = validateSteamUrl('not-a-url');
        expect(result).toBe('Bitte gib eine gültige URL ein (z.B. https://steamcommunity.com/id/...)');
    });

    test('non-Steam URL returns error', () => {
        const result = validateSteamUrl('https://example.com/profile');
        expect(result).toBe('Bitte gib eine gültige Steam-URL ein');
    });

    test('www.steamcommunity.com is valid', () => {
        expect(validateSteamUrl('https://www.steamcommunity.com/id/user')).toBeNull();
    });

    test('www.steampowered.com is valid', () => {
        expect(validateSteamUrl('https://www.steampowered.com/app/123')).toBeNull();
    });
});

describe('isValidHttpUrl', () => {
    test('valid https URL returns true', () => {
        expect(isValidHttpUrl('https://example.com')).toBe(true);
    });

    test('valid http URL returns true', () => {
        expect(isValidHttpUrl('http://example.com')).toBe(true);
    });

    test('invalid string returns false', () => {
        expect(isValidHttpUrl('not-a-url')).toBe(false);
    });

    test('empty string returns false', () => {
        expect(isValidHttpUrl('')).toBe(false);
    });
});
