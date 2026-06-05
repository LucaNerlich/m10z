import {describe, expect, test, vi} from 'vitest';

import {countWords, extractTextFromRichtext, extractWordCount} from './wordCount';

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
