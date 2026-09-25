import {describe, expect, it} from 'vitest';

import {buildStatistikSnapshot, parseStatistikSnapshot, serializeStatistikSnapshot} from './snapshot';

const source = {
    generatedAt: '2024-03-15T10:00:00.000Z',
    authors: [
        {documentId: 'au1', slug: 'ben', title: ' Ben '},
        {documentId: 'au2', slug: 'anna', title: 'Anna'},
        {documentId: 'au3', slug: null, title: 'Ohne Slug'},
    ],
    categories: [{documentId: 'c1', slug: 'games', title: 'Games'}],
    articles: [
        {
            documentId: 'x2',
            slug: 'later',
            title: ' Später ',
            date: null,
            publishedAt: '2024-01-02T10:00:00.000Z',
            wordCount: 1234.4,
            authors: [{documentId: 'au1'}, {documentId: 'au2'}, {documentId: 'au1'}, {documentId: 'missing'}],
            categories: [{documentId: 'c1'}],
        },
        {
            documentId: 'x1',
            slug: 'earlier',
            title: 'Früher',
            date: '2023-12-31T23:00:00.000Z',
            publishedAt: '2024-01-05T10:00:00.000Z',
            wordCount: 0,
            authors: null,
            categories: undefined,
        },
        {documentId: 'x3', slug: 'no-date', title: 'Kein Datum', date: null, publishedAt: null},
    ],
    podcasts: [
        {documentId: 'p1', slug: 'folge-1', title: 'Folge 1', date: '2023-05-01T18:00:00Z', duration: 3600, authors: [{documentId: 'au2'}]},
    ],
};

describe('buildStatistikSnapshot', () => {
    const snapshot = buildStatistikSnapshot(source);

    it('keeps only minimal, cleaned fields sorted by date', () => {
        expect(snapshot.articles).toEqual([
            {slug: 'earlier', title: 'Früher', date: '2023-12-31T23:00:00.000Z', wordCount: null, authors: [], categories: []},
            {
                slug: 'later',
                title: 'Später',
                date: '2024-01-02T10:00:00.000Z',
                wordCount: 1234,
                authors: ['anna', 'ben'],
                categories: ['games'],
            },
        ]);
        expect(snapshot.podcasts).toEqual([
            {slug: 'folge-1', title: 'Folge 1', date: '2023-05-01T18:00:00.000Z', duration: 3600, authors: ['anna'], categories: []},
        ]);
    });

    it('lists authors and categories with slugs only', () => {
        expect(snapshot.authors).toEqual([
            {slug: 'anna', name: 'Anna'},
            {slug: 'ben', name: 'Ben'},
        ]);
        expect(snapshot.categories).toEqual([{slug: 'games', name: 'Games'}]);
    });
});

describe('parseStatistikSnapshot', () => {
    it('round-trips a serialized snapshot', () => {
        const snapshot = buildStatistikSnapshot(source);
        const yaml = serializeStatistikSnapshot(snapshot);
        expect(yaml.startsWith('# M10Z Statistik-Snapshot')).toBe(true);
        expect(parseStatistikSnapshot(yaml)).toEqual(snapshot);
    });

    it('rejects unknown versions', () => {
        expect(() => parseStatistikSnapshot('version: 2\ngeneratedAt: 2024-01-01T00:00:00Z\n')).toThrow(/version/);
    });

    it('rejects malformed entries with a path', () => {
        const yaml = [
            'version: 1',
            'generatedAt: 2024-01-01T00:00:00.000Z',
            'articles:',
            '  - slug: a',
            '    title: A',
            '    date: not-a-date',
        ].join('\n');
        expect(() => parseStatistikSnapshot(yaml)).toThrow('articles[0].date');
    });

    it('rejects a non-object document', () => {
        expect(() => parseStatistikSnapshot('- 1\n- 2\n')).toThrow(/snapshot/);
    });
});
