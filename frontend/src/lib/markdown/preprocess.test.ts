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
});
