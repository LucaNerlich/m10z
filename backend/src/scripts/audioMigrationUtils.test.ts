import {describe, expect, test} from 'vitest';

import {extractFilename, findExistingFileByName, getMimeType, validateUrl} from './audioMigrationUtils';

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

describe('findExistingFileByName', () => {
    const base = 'https://cms.example.com';
    const token = 'api-token';

    test('returns the matching file when it exists with the exact name', async () => {
        const fetchFn = async (url: string) => {
            expect(url).toBe(`${base}/api/upload/files?filters[name][$eq]=song.mp3`);
            return {
                ok: true,
                json: async () => [{id: 7, name: 'song.mp3', url: '/uploads/song.mp3'}],
            };
        };

        const result = await findExistingFileByName(fetchFn as any, base, token, 'song.mp3');

        expect(result).toEqual({id: 7, url: '/uploads/song.mp3'});
    });

    test('returns null when the response has no matching file', async () => {
        const fetchFn = async () => ({ok: true, json: async () => [{id: 1, name: 'other.mp3', url: ''}]});
        expect(await findExistingFileByName(fetchFn as any, base, token, 'song.mp3')).toBeNull();
    });

    test('returns null on HTTP errors and network failures', async () => {
        expect(await findExistingFileByName(async () => ({ok: false}) as any, base, token, 'song.mp3')).toBeNull();
        expect(
            await findExistingFileByName(async () => {
                throw new Error('network down');
            }, base, token, 'song.mp3'),
        ).toBeNull();
    });
});
