import {describe, expect, test} from 'vitest';

import {preprocessMarkdown} from './preprocess';

describe('preprocessMarkdown', () => {
    test('converts ==mark== to <mark>', () => {
        expect(preprocessMarkdown('==highlight==')).toBe('<mark>highlight</mark>');
    });

    test('converts ++ins++ to <ins>', () => {
        expect(preprocessMarkdown('++inserted++')).toBe('<ins>inserted</ins>');
    });

    test('converts ^sup^ to <sup>', () => {
        expect(preprocessMarkdown('E = mc^2^')).toBe('E = mc<sup>2</sup>');
    });

    test('converts ~sub~ to <sub>', () => {
        expect(preprocessMarkdown('H~2~O')).toBe('H<sub>2</sub>O');
    });

    test('preserves GFM ~~strikethrough~~', () => {
        expect(preprocessMarkdown('~~gone~~')).toBe('~~gone~~');
    });

    test('preserves footnote references like [^1]', () => {
        expect(preprocessMarkdown('A claim[^1]')).toBe('A claim[^1]');
    });

    test('strips inline <br> tags (with or without slash)', () => {
        expect(preprocessMarkdown('line<br>break<br/>here')).toBe('linebreakhere');
    });

    test('applies multiple transforms together', () => {
        expect(preprocessMarkdown('==a== and ++b++ and ^c^ and ~d~')).toBe(
            '<mark>a</mark> and <ins>b</ins> and <sup>c</sup> and <sub>d</sub>',
        );
    });

    test('leaves fenced code blocks untouched', () => {
        const source = [
            '==outside==',
            '```js',
            'const x = a == b;',
            '<br>',
            '~~not strike~~',
            '```',
            '==also outside==',
        ].join('\n');
        const expected = [
            '<mark>outside</mark>',
            '```js',
            'const x = a == b;',
            '<br>',
            '~~not strike~~',
            '```',
            '<mark>also outside</mark>',
        ].join('\n');
        expect(preprocessMarkdown(source)).toBe(expected);
    });

    test('leaves tilde-fenced code blocks untouched', () => {
        const source = ['~~~', 'H~2~O', '~~~', 'H~2~O'].join('\n');
        const expected = ['~~~', 'H~2~O', '~~~', 'H<sub>2</sub>O'].join('\n');
        expect(preprocessMarkdown(source)).toBe(expected);
    });

    test('leaves inline code spans untouched', () => {
        expect(preprocessMarkdown('Use `<br>` to force a line break.')).toBe(
            'Use `<br>` to force a line break.',
        );
        expect(preprocessMarkdown('Compare `a == b` in code.')).toBe('Compare `a == b` in code.');
        expect(preprocessMarkdown('`x++y` and `^caret^` and `~tilde~`')).toBe(
            '`x++y` and `^caret^` and `~tilde~`',
        );
    });

    test('still transforms text outside an inline code span on the same line', () => {
        expect(preprocessMarkdown('==mark== then `==literal==` then ^sup^')).toBe(
            '<mark>mark</mark> then `==literal==` then <sup>sup</sup>',
        );
    });

    test('handles double-backtick spans', () => {
        expect(preprocessMarkdown('``a == b`` stays')).toBe('``a == b`` stays');
    });

    // Pinned as-is: the transform set is intentionally unchanged, so prose that
    // uses `~` as "approximately" still forms a subscript pair.
    test('keeps the existing tilde semantics outside code spans', () => {
        expect(preprocessMarkdown('~10 bis ~20 Minuten')).toBe('<sub>10 bis </sub>20 Minuten');
    });

    test('leaves link destinations and attribute values untouched', () => {
        expect(preprocessMarkdown('[x](https://a.test/?q=a==b==)')).toBe('[x](https://a.test/?q=a==b==)');
        expect(preprocessMarkdown('<img alt="a==b==c">')).toBe('<img alt="a==b==c">');
        expect(preprocessMarkdown('==mark== [x](https://a.test/?q=a==b==)')).toBe(
            '<mark>mark</mark> [x](https://a.test/?q=a==b==)',
        );
    });

    test('keeps prose transforms outside a protected region on the same line', () => {
        expect(preprocessMarkdown('a==b== [x](https://a.test/?q=a==b==) c==d==')).toBe(
            'a<mark>b</mark> [x](https://a.test/?q=a==b==) c<mark>d</mark>',
        );
    });
});
