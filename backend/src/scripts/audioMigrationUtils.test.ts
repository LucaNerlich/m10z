import {afterEach, describe, expect, test, vi} from 'vitest';

import {buildUploadFormData, extractFilename, findExistingFileByName, getMimeType, interpretUploadResponse, validateUrl} from './audioMigrationUtils';

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

        expect(result).toEqual({status: 'found', file: {id: 7, url: '/uploads/song.mp3'}});
    });

    test('reports absent when the response has no matching file', async () => {
        const fetchFn = async () => ({ok: true, json: async () => [{id: 1, name: 'other.mp3', url: ''}]});
        expect(await findExistingFileByName(fetchFn as any, base, token, 'song.mp3')).toEqual({
            status: 'absent',
        });
    });

    test('reports unknown when the lookup request fails, so callers do not retry', async () => {
        expect(
            await findExistingFileByName(async () => ({ok: false, status: 500}) as any, base, token, 'song.mp3'),
        ).toEqual({status: 'unknown', reason: 'media library request failed (HTTP 500)'});
        expect(
            await findExistingFileByName(async () => {
                throw new Error('network down');
            }, base, token, 'song.mp3'),
        ).toEqual({status: 'unknown', reason: 'network down'});
    });

    test('reports unknown for a response body that is not a file list', async () => {
        const fetchFn = async () => ({ok: true, json: async () => ({unexpected: 'shape'})});

        expect(await findExistingFileByName(fetchFn as any, base, token, 'song.mp3')).toEqual({
            status: 'unknown',
            reason: 'unexpected media library response body',
        });
    });
});

describe('interpretUploadResponse', () => {
    test('returns the uploaded file for a well-formed array body without a lookup', async () => {
        const lookupExisting = vi.fn(async () => null);

        const outcome = await interpretUploadResponse(
            [{id: 12, url: '/uploads/episode.mp3'}],
            lookupExisting,
        );

        expect(outcome).toEqual({status: 'uploaded', id: 12, url: '/uploads/episode.mp3'});
        expect(lookupExisting).not.toHaveBeenCalled();
    });

    test('treats a wrong-shape 200 as success when the file is already in the media library', async () => {
        const lookupExisting = vi.fn(async () => ({id: 7, url: '/uploads/episode.mp3'}));

        const outcome = await interpretUploadResponse({}, lookupExisting);

        expect(outcome).toEqual({status: 'existing', id: 7, url: '/uploads/episode.mp3'});
        expect(lookupExisting).toHaveBeenCalledTimes(1);
    });

    test('reports an unexpected body when the file is not in the media library', async () => {
        const lookupExisting = vi.fn(async () => null);

        const outcome = await interpretUploadResponse({unexpected: 'shape'}, lookupExisting);

        expect(outcome).toMatchObject({
            status: 'unexpected',
            message: expect.stringContaining('Unexpected Strapi upload response format'),
        });
    });

    // `[]` is the plausible ambiguous body where `Array.isArray` passes but
    // `parsed[0]` is missing; the others pass the array check with a malformed
    // first element. None of them may take the `uploaded` path.
    describe('array-shaped invalid bodies', () => {
        const found = {id: 7, url: '/uploads/episode.mp3'};

        test.each([
            ['[] with an existing file', [], async () => found, 'existing'],
            ['[] with no existing file', [], async () => null, 'unexpected'],
            ['[{}] with no existing file', [{}], async () => null, 'unexpected'],
            ['[null] with no existing file', [null], async () => null, 'unexpected'],
            ["[{id: '12'}] with no existing file", [{id: '12'}], async () => null, 'unexpected'],
        ])('%s', async (_label, body, lookupExisting, status) => {
            const outcome = await interpretUploadResponse(body, lookupExisting);

            expect(outcome.status).toBe(status);
        });
    });

    test('truncates a huge body in the unexpected message', async () => {
        const lookupExisting = vi.fn(async () => null);

        const outcome = await interpretUploadResponse({blob: 'x'.repeat(5000)}, lookupExisting);

        expect(outcome.status).toBe('unexpected');
        if (outcome.status !== 'unexpected') return;
        expect(outcome.message).toContain('…');
        expect(outcome.message.length).toBeLessThan(400);
    });
});

describe('buildUploadFormData', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('produces a native FormData body that the global fetch accepts', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('[]', {status: 200}));
        vi.stubGlobal('fetch', fetchMock);

        const body = buildUploadFormData(Buffer.from('audio-bytes'), 'episode-001.mp3');
        await fetch('https://cms.m10z.de/api/upload', {method: 'POST', body});

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const init = fetchMock.mock.calls[0][1] as RequestInit;
        expect(init.body).toBeInstanceOf(FormData);
    });

    test('names the file and sets the audio MIME type', () => {
        const body = buildUploadFormData(Buffer.from('x'), 'episode-001.mp3');

        const file = body.get('files');
        expect(file).toBeInstanceOf(File);
        expect((file as File).name).toBe('episode-001.mp3');
        expect((file as File).type).toBe('audio/mpeg');
    });
});
