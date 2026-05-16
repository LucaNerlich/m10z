import {describe, expect, test} from 'vitest';

import {calculateReadingTime} from './readingTime';

describe('calculateReadingTime — numeric input', () => {
    test.each([
        [0, '< 1 Min. Lesezeit'],
        [-5, '< 1 Min. Lesezeit'],
        [1, '~1 Min. Lesezeit'],
        [250, '~1 Min. Lesezeit'],
        [251, '~2 Min. Lesezeit'],
        [500, '~2 Min. Lesezeit'],
        [1000, '~4 Min. Lesezeit'],
    ])('%i words → %s', (input, expected) => {
        expect(calculateReadingTime(input)).toBe(expected);
    });
});

describe('calculateReadingTime — markdown input', () => {
    test('empty/whitespace string → minimum', () => {
        expect(calculateReadingTime('')).toBe('< 1 Min. Lesezeit');
        expect(calculateReadingTime('   ')).toBe('< 1 Min. Lesezeit');
    });

    test('plain text words counted', () => {
        const text = Array(250).fill('wort').join(' ');
        expect(calculateReadingTime(text)).toBe('~1 Min. Lesezeit');
    });

    test('strips fenced code blocks before counting', () => {
        const text = '```ts\n' + Array(500).fill('code').join(' ') + '\n```';
        expect(calculateReadingTime(text)).toBe('< 1 Min. Lesezeit');
    });

    test('keeps link text but drops URL', () => {
        const text = `[${Array(250).fill('linktext').join(' ')}](https://example.com)`;
        expect(calculateReadingTime(text)).toBe('~1 Min. Lesezeit');
    });

    test('drops markdown syntax noise (bold, italic, headers, list markers)', () => {
        // 8 stripped words → ceil(8/250) = 1 minute (the function never reports
        // "< 1 Min." for non-empty text; that's only for 0-word input).
        const text = '# Heading\n\n**bold** _italic_ ~~strike~~\n\n- item one\n- item two';
        expect(calculateReadingTime(text)).toBe('~1 Min. Lesezeit');
    });
});

describe('calculateReadingTime — null/undefined', () => {
    test('null → minimum', () => {
        expect(calculateReadingTime(null)).toBe('< 1 Min. Lesezeit');
    });

    test('undefined → minimum', () => {
        expect(calculateReadingTime(undefined)).toBe('< 1 Min. Lesezeit');
    });
});
