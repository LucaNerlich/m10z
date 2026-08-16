import {describe, expect, test} from 'vitest';

import {isValidSearchIndexFile} from './validateSearchIndex';

function makeIndex(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
    return {
        version: 1,
        generatedAt: '2025-01-01T00:00:00.000Z',
        total: 1,
        records: [
            {
                id: '1',
                type: 'article',
                slug: 'my-article',
                title: 'My Article',
                description: null,
                content: 'body',
                href: '/artikel/my-article',
                publishedAt: '2025-01-01T00:00:00.000Z',
                tags: [],
                coverImageUrl: null,
            },
        ],
        ...overrides,
    };
}

describe('isValidSearchIndexFile', () => {
    test('accepts a well-formed index with internal hrefs', () => {
        expect(isValidSearchIndexFile(makeIndex())).toBe(true);
    });

    test('rejects external http(s) hrefs', () => {
        const index = makeIndex();
        (index.records as {href: string}[])[0]!.href = 'https://evil.example/phish';
        expect(isValidSearchIndexFile(index)).toBe(false);
    });

    test('rejects protocol-relative hrefs', () => {
        const index = makeIndex();
        (index.records as {href: string}[])[0]!.href = '//evil.example/phish';
        expect(isValidSearchIndexFile(index)).toBe(false);
    });

    test('rejects javascript: hrefs', () => {
        const index = makeIndex();
        (index.records as {href: string}[])[0]!.href = 'javascript:alert(1)';
        expect(isValidSearchIndexFile(index)).toBe(false);
    });

    test('rejects empty hrefs', () => {
        const index = makeIndex();
        (index.records as {href: string}[])[0]!.href = '';
        expect(isValidSearchIndexFile(index)).toBe(false);
    });
});
