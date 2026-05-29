import {describe, expect, test} from 'vitest';

import {extractFilename, getMimeType, validateUrl} from './audioMigrationUtils';

describe('validateUrl', () => {
    test('accepts an HTTPS URL on the allowed domain', () => {
        expect(() => validateUrl('https://m10z.picnotes.de/M10Z/M10Z_001.mp3')).not.toThrow();
    });

    test('rejects malformed URLs', () => {
        expect(() => validateUrl('not a url')).toThrow(/Invalid URL format/);
    });

    test('rejects URLs from other hosts (SSRF guard)', () => {
        expect(() => validateUrl('https://evil.test/file.mp3')).toThrow(/does not match allowed domain/);
    });

    test('rejects non-HTTPS URLs', () => {
        expect(() => validateUrl('http://m10z.picnotes.de/file.mp3')).toThrow(/must use HTTPS/);
    });
});

describe('extractFilename', () => {
    test('returns the basename of the URL path', () => {
        expect(extractFilename('https://m10z.picnotes.de/a/b/file.mp3')).toBe('file.mp3');
    });

    test('throws when no filename can be derived', () => {
        expect(() => extractFilename('https://m10z.picnotes.de/')).toThrow(/Could not extract filename/);
    });
});

describe('getMimeType', () => {
    test.each([
        ['song.mp3', 'audio/mpeg'],
        ['clip.flac', 'audio/flac'],
        ['voice.m4a', 'audio/mp4'],
        ['SHOUTING.MP3', 'audio/mpeg'],
    ])('%s → %s', (filename, expected) => {
        expect(getMimeType(filename)).toBe(expected);
    });

    test('falls back to application/octet-stream for unknown extensions', () => {
        expect(getMimeType('archive.xyz')).toBe('application/octet-stream');
        expect(getMimeType('noext')).toBe('application/octet-stream');
    });
});
