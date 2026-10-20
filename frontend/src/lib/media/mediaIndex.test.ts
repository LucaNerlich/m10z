import {describe, expect, it} from 'vitest';

import {
    buildMediaIndex,
    collectMediaBlurhashes,
    enrichMarkdownImages,
    lookupMediaMetadata,
    MEDIA_INDEX_VERSION,
    type MediaIndexFile,
    normalizeMediaKey,
    parseMediaIndex,
    serializeMediaIndex,
} from './mediaIndex';

const BASE = 'https://cms.m10z.de';
const BLUR = 'data:image/png;base64,AAAA';

const index = (entries: MediaIndexFile['entries']): MediaIndexFile => ({
    version: MEDIA_INDEX_VERSION,
    baseUrl: BASE,
    generatedAt: '2026-01-01T00:00:00.000Z',
    entries,
});

describe('normalizeMediaKey', () => {
    it('normalises relative and same-origin absolute URLs to a pathname key', () => {
        expect(normalizeMediaKey('/uploads/a.jpg', BASE)).toBe('uploads/a.jpg');
        expect(normalizeMediaKey('uploads/a.jpg', BASE)).toBe('uploads/a.jpg');
        expect(
            normalizeMediaKey('https://cms.m10z.de/uploads/a.jpg', BASE)
        ).toBe('uploads/a.jpg');
        expect(
            normalizeMediaKey('https://cms.m10z.de/uploads/a.jpg?v=2', BASE)
        ).toBe('uploads/a.jpg');
    });

    it('rejects foreign hosts, protocol-relative URLs and empty input', () => {
        expect(
            normalizeMediaKey('https://evil.test/uploads/a.jpg', BASE)
        ).toBeNull();
        expect(normalizeMediaKey('//evil.test/uploads/a.jpg', BASE)).toBeNull();
        expect(normalizeMediaKey('   ', BASE)).toBeNull();
    });
});

describe('collectMediaBlurhashes', () => {
    it('keys usable blur placeholders by normalised URL and skips the rest', () => {
        const blurhashes = collectMediaBlurhashes(
            [
                {url: '/uploads/a.jpg', blurhash: BLUR},
                {
                    url: 'https://cms.m10z.de/uploads/b.jpg',
                    blurhash: '  data:image/webp;base64,BBBB  ',
                },
                {url: '/uploads/empty.jpg', blurhash: null},
                {url: '/uploads/text.jpg', blurhash: 'not-a-data-url'},
                {url: 'https://evil.test/uploads/a.jpg', blurhash: BLUR},
                {url: null, blurhash: BLUR},
            ],
            BASE
        );

        expect([...blurhashes.keys()]).toEqual([
            'uploads/a.jpg',
            'uploads/b.jpg',
        ]);
        expect(blurhashes.get('uploads/b.jpg')).toBe(
            'data:image/webp;base64,BBBB'
        );
    });
});

describe('buildMediaIndex', () => {
    it('keeps only assets with a URL and some metadata, sorted and trimmed', () => {
        const built = buildMediaIndex({
            generatedAt: '2026-01-01T00:00:00.000Z',
            baseUrl: BASE,
            assets: [
                {
                    url: '/uploads/b.jpg',
                    alternativeText: '  B  ',
                    caption: null,
                },
                {
                    url: '/uploads/a.jpg',
                    alternativeText: null,
                    caption: 'A caption',
                },
                {url: '/uploads/empty.jpg', alternativeText: ' ', caption: ''},
                {url: null, alternativeText: 'no url', caption: 'no url'},
            ],
        });
        expect(Object.keys(built.entries)).toEqual([
            'uploads/a.jpg',
            'uploads/b.jpg',
        ]);
        expect(built.entries['uploads/b.jpg']).toEqual({
            alt: 'B',
            caption: undefined,
        });
        expect(built.entries['uploads/a.jpg']).toEqual({
            alt: undefined,
            caption: 'A caption',
        });
    });

    it('merges blurhashes and keeps entries that only carry one', () => {
        const built = buildMediaIndex({
            generatedAt: '2026-01-01T00:00:00.000Z',
            baseUrl: BASE,
            assets: [
                {
                    url: '/uploads/with-alt.jpg',
                    alternativeText: 'Alt',
                    caption: null,
                },
                {
                    url: '/uploads/blur-only.jpg',
                    alternativeText: null,
                    caption: null,
                },
                {
                    url: '/uploads/foreign-host.jpg',
                    alternativeText: null,
                    caption: null,
                },
                {
                    url: '/uploads/invalid-blur.jpg',
                    alternativeText: null,
                    caption: null,
                },
            ],
            blurhashes: new Map([
                ['uploads/with-alt.jpg', BLUR],
                ['uploads/blur-only.jpg', BLUR],
                ['uploads/invalid-blur.jpg', 'not-a-data-url'],
            ]),
        });

        expect(Object.keys(built.entries)).toEqual([
            'uploads/blur-only.jpg',
            'uploads/with-alt.jpg',
        ]);
        expect(built.entries['uploads/with-alt.jpg']).toEqual({
            alt: 'Alt',
            caption: undefined,
            blurhash: BLUR,
        });
        expect(built.entries['uploads/blur-only.jpg']).toEqual({
            alt: undefined,
            caption: undefined,
            blurhash: BLUR,
        });
    });
});

describe('serialize/parse', () => {
    it('round-trips and stays deterministic', () => {
        const built = buildMediaIndex({
            generatedAt: '2026-01-01T00:00:00.000Z',
            baseUrl: BASE,
            assets: [
                {url: '/uploads/a.jpg', alternativeText: 'Alt', caption: 'Cap'},
            ],
            blurhashes: new Map([['uploads/a.jpg', BLUR]]),
        });
        const roundTripped = parseMediaIndex(serializeMediaIndex(built));
        expect(roundTripped).toEqual(built);
        expect(serializeMediaIndex(built)).toBe(
            serializeMediaIndex(roundTripped)
        );
    });

    it('rejects unsupported versions and malformed payloads', () => {
        expect(() =>
            parseMediaIndex(
                `{"version":${MEDIA_INDEX_VERSION + 1},"baseUrl":"x","generatedAt":"y","entries":{}}`
            )
        ).toThrow(/version/);
        expect(() =>
            parseMediaIndex(
                `{"version":${MEDIA_INDEX_VERSION},"baseUrl":"x","entries":{}}`
            )
        ).toThrow(/generatedAt/);
        expect(() =>
            parseMediaIndex(
                `{"version":${MEDIA_INDEX_VERSION},"baseUrl":"x","generatedAt":"y"}`
            )
        ).toThrow(/entries/);
        expect(() =>
            parseMediaIndex(
                `{"version":${MEDIA_INDEX_VERSION},"baseUrl":"x","generatedAt":"y","entries":{"a":5}}`
            )
        ).toThrow(/invalid/);
        expect(() =>
            parseMediaIndex(
                `{"version":${MEDIA_INDEX_VERSION},"baseUrl":"x","generatedAt":"y","entries":{"a":{"blurhash":"https://evil.test/x.png"}}}`
            )
        ).toThrow(/invalid/);
        expect(() => parseMediaIndex('not json')).toThrow();
    });
});

describe('lookupMediaMetadata', () => {
    it('finds entries by pathname and ignores foreign hosts', () => {
        const idx = index({'uploads/a.jpg': {alt: 'Alt', caption: 'Cap'}});
        expect(
            lookupMediaMetadata(idx, 'https://cms.m10z.de/uploads/a.jpg')
        ).toEqual({alt: 'Alt', caption: 'Cap'});
        expect(lookupMediaMetadata(idx, '/uploads/a.jpg')).toEqual({
            alt: 'Alt',
            caption: 'Cap',
        });
        expect(
            lookupMediaMetadata(idx, 'https://evil.test/uploads/a.jpg')
        ).toBeNull();
        expect(lookupMediaMetadata(idx, '/uploads/missing.jpg')).toBeNull();
    });
});

describe('enrichMarkdownImages', () => {
    const idx = index({
        'uploads/logo.webp': {alt: 'Logo', caption: 'Ein Logo'},
        'uploads/alt-only.jpg': {alt: 'Nur Alt'},
        'uploads/caption-only.jpg': {caption: 'Nur Caption'},
    });

    it('replaces the filename alt and adds the caption as title', () => {
        const md = '![logo.webp](https://cms.m10z.de/uploads/logo.webp)';
        expect(enrichMarkdownImages(md, idx)).toBe(
            '![Logo](https://cms.m10z.de/uploads/logo.webp "Ein Logo")'
        );
    });

    it('keeps the authored Markdown value when the media field is empty', () => {
        expect(
            enrichMarkdownImages('![author alt](/uploads/alt-only.jpg)', idx)
        ).toBe('![Nur Alt](/uploads/alt-only.jpg)');
        expect(
            enrichMarkdownImages(
                '![author alt](/uploads/caption-only.jpg)',
                idx
            )
        ).toBe('![author alt](/uploads/caption-only.jpg "Nur Caption")');
    });

    it('leaves images without an index entry and foreign hosts untouched', () => {
        expect(enrichMarkdownImages('![x](/uploads/unknown.jpg)', idx)).toBe(
            '![x](/uploads/unknown.jpg)'
        );
        expect(
            enrichMarkdownImages(
                '![x](https://evil.test/uploads/logo.webp)',
                idx
            )
        ).toBe('![x](https://evil.test/uploads/logo.webp)');
    });

    it('does not touch images inside fenced code blocks', () => {
        const md = '```\n![logo.webp](/uploads/logo.webp)\n```';
        expect(enrichMarkdownImages(md, idx)).toBe(md);
    });

    it('is idempotent', () => {
        const md = '![logo.webp](/uploads/logo.webp)';
        const once = enrichMarkdownImages(md, idx);
        expect(enrichMarkdownImages(once, idx)).toBe(once);
    });

    it('is a no-op without an index or input', () => {
        expect(enrichMarkdownImages('![x](/uploads/logo.webp)', null)).toBe(
            '![x](/uploads/logo.webp)'
        );
        expect(enrichMarkdownImages('', idx)).toBe('');
    });
});
