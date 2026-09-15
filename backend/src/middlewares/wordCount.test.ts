import {describe, expect, test, vi} from 'vitest';

import {countWords, extractTextFromRichtext, extractWordCount, wordCountMiddleware} from './wordCount';

describe('countWords', () => {
    test('returns 0 for empty, whitespace, null, or non-string input', () => {
        expect(countWords('')).toBe(0);
        expect(countWords('   \n  ')).toBe(0);
        expect(countWords(null)).toBe(0);
        expect(countWords(undefined)).toBe(0);
        expect(countWords(123 as unknown as string)).toBe(0);
    });

    test('counts plain words', () => {
        expect(countWords('one two three')).toBe(3);
    });

    test('strips ATX headers but keeps their words', () => {
        expect(countWords('# Title here')).toBe(2);
    });

    test('removes fenced code blocks', () => {
        expect(countWords('a ```\ncode block ignored\n``` b')).toBe(2);
    });

    test('removes inline code entirely', () => {
        expect(countWords('alpha `beta` gamma')).toBe(2);
    });

    test('keeps image alt text and link text', () => {
        expect(countWords('keep ![alt text](u) here')).toBe(4);
        expect(countWords('see [the docs](https://x)')).toBe(3);
    });

    test('strips emphasis markers and HTML tags', () => {
        expect(countWords('**bold** _italic_')).toBe(2);
        expect(countWords('<p>html removed</p> word')).toBe(3);
    });

    test('does not corrupt snake_case identifiers via underscore emphasis rules', () => {
        expect(countWords('word_one und another_word')).toBe(3);
        expect(countWords('die datei_x_y ist da')).toBe(4);
    });

    test('keeps comparison operators that look like HTML tags', () => {
        expect(countWords('3 < 4 und 5 > 4')).toBe(7);
    });

    test('counts words containing German umlauts', () => {
        expect(countWords('Schöne Größe')).toBe(2);
    });
});

describe('extractTextFromRichtext', () => {
    test('returns null for falsy input', () => {
        expect(extractTextFromRichtext(null)).toBeNull();
        expect(extractTextFromRichtext(undefined)).toBeNull();
        expect(extractTextFromRichtext('')).toBeNull();
    });

    test('returns markdown strings unchanged', () => {
        expect(extractTextFromRichtext('# Hello')).toBe('# Hello');
    });

    test('extracts text from a ProseMirror doc tree', () => {
        const doc = {
            type: 'doc',
            content: [
                {type: 'paragraph', content: [{type: 'text', text: 'Hello'}, {type: 'text', text: 'world'}]},
            ],
        };
        const result = extractTextFromRichtext(doc);
        expect(result).toContain('Hello');
        expect(result).toContain('world');
    });

    test('returns null for an empty doc tree', () => {
        expect(extractTextFromRichtext({type: 'doc', content: []})).toBeNull();
    });

    test('skips nested empty blocks instead of failing on them', () => {
        const blocks = [
            {type: 'paragraph', content: 'Hallo'},
            {type: 'quote', content: []},
            {type: 'paragraph', content: 'Welt'},
        ];
        expect(extractTextFromRichtext(blocks)).toBe('Hallo Welt');
    });

    test('joins text from an array of nodes', () => {
        expect(extractTextFromRichtext([{text: 'a'}, {text: 'b'}])).toBe('a b');
    });
});

function makeStrapi() {
    return {
        log: {info: vi.fn(), warn: vi.fn(), error: vi.fn()},
    } as never;
}

describe('extractWordCount', () => {
    test('sets wordCount from article content', async () => {
        const data: Record<string, unknown> = {content: 'one two three'};
        await extractWordCount(makeStrapi(), data as never, 'article');
        expect(data.wordCount).toBe(3);
    });

    test('sets wordCount from podcast shownotes', async () => {
        const data: Record<string, unknown> = {shownotes: 'alpha beta'};
        await extractWordCount(makeStrapi(), data as never, 'podcast');
        expect(data.wordCount).toBe(2);
    });

    test('leaves wordCount untouched on a partial update that omits the body field', async () => {
        // Cron backfills send only {wordCount}; the middleware must not reset it to 0.
        const data: Record<string, unknown> = {wordCount: 999};
        await extractWordCount(makeStrapi(), data as never, 'article');
        expect(data.wordCount).toBe(999);
    });

    test('sets wordCount to 0 when the body field is present but empty', async () => {
        const data: Record<string, unknown> = {content: null};
        await extractWordCount(makeStrapi(), data as never, 'article');
        expect(data.wordCount).toBe(0);
    });
});

/**
 * Strapi's "Duplicate" admin action runs a `clone` document-service action, which merges
 * `context.params.data` into every cloned entry — so the recompute must load the *source*
 * entry (by `context.params.documentId`) and inject the computed value into that same
 * `data` object before `next()` runs the actual clone.
 */
function makeCloneStrapi(sourceEntry: Record<string, unknown>) {
    const findOne = vi.fn(async () => sourceEntry);
    const strapi = {
        documents: vi.fn(() => ({findOne})),
        log: {info: vi.fn(), warn: vi.fn(), error: vi.fn()},
    };
    return {strapi, findOne};
}

describe('wordCountMiddleware clone handling', () => {
    test('injects wordCount computed from the source podcast shownotes into data', async () => {
        const {strapi, findOne} = makeCloneStrapi({shownotes: 'one two three'});
        const next = vi.fn(async () => ({entries: [{documentId: 'clone-1'}]}));
        const context = {
            uid: 'api::podcast.podcast',
            action: 'clone',
            contentType: {uid: 'api::podcast.podcast', modelName: 'podcast'},
            params: {strapi: strapi as never, documentId: 'source-1'},
        };

        await wordCountMiddleware(context, next);

        expect(findOne).toHaveBeenCalledWith({documentId: 'source-1'});
        expect(next).toHaveBeenCalledTimes(1);
        expect(context.params.data).toEqual({wordCount: 3});
    });

    test('injects wordCount computed from the source article content into data', async () => {
        const {strapi} = makeCloneStrapi({content: 'alpha beta'});
        const next = vi.fn(async () => ({entries: [{documentId: 'clone-2'}]}));
        const context = {
            uid: 'api::article.article',
            action: 'clone',
            contentType: {uid: 'api::article.article', modelName: 'article'},
            params: {strapi: strapi as never, documentId: 'source-2'},
        };

        await wordCountMiddleware(context, next);

        expect(context.params.data).toEqual({wordCount: 2});
    });

    test('preserves any other override fields already present on data', async () => {
        const {strapi} = makeCloneStrapi({content: 'alpha beta'});
        const next = vi.fn(async () => ({entries: [{documentId: 'clone-3'}]}));
        const context = {
            uid: 'api::article.article',
            action: 'clone',
            contentType: {uid: 'api::article.article', modelName: 'article'},
            params: {strapi: strapi as never, documentId: 'source-3', data: {title: 'Copy'}},
        };

        await wordCountMiddleware(context, next);

        expect(context.params.data).toEqual({title: 'Copy', wordCount: 2});
    });

    test('leaves non-article/podcast content types untouched on clone', async () => {
        const {strapi, findOne} = makeCloneStrapi({});
        const next = vi.fn(async () => ({entries: [{documentId: 'clone-4'}]}));

        await wordCountMiddleware(
            {
                uid: 'api::author.author',
                action: 'clone',
                contentType: {uid: 'api::author.author', modelName: 'author'},
                params: {strapi: strapi as never},
            },
            next,
        );

        expect(findOne).not.toHaveBeenCalled();
    });
});
