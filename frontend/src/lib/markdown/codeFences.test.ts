import {describe, expect, test} from 'vitest';

import {markCodeFenceLines} from './codeFences';

/** Compact view for assertions: the line with a marker for in-code lines. */
function marked(markdown: string): string[] {
    return markCodeFenceLines(markdown).map(({line, inCode}) => `${inCode ? 'C' : '-'} ${line}`);
}

describe('markCodeFenceLines', () => {
    test('marks nothing when there are no fences', () => {
        expect(marked('a\nb')).toEqual(['- a', '- b']);
    });

    test('marks a backtick fence, its body and the closing fence', () => {
        expect(marked('==out==\n```js\nx\n```\n==out==')).toEqual([
            '- ==out==',
            'C ```js',
            'C x',
            'C ```',
            '- ==out==',
        ]);
    });

    test('marks tilde fences too', () => {
        expect(marked('~~~\nH~2~O\n~~~\nH~2~O')).toEqual(['C ~~~', 'C H~2~O', 'C ~~~', '- H~2~O']);
    });

    test('does not close a backtick fence with a tilde line', () => {
        // A ``` block may legitimately contain a `~~~` line; CommonMark only
        // closes it with ```, so the interior must stay marked as code.
        expect(marked('```\n~~~\n==x==\n# not a heading\n```\n==out==')).toEqual([
            'C ```',
            'C ~~~',
            'C ==x==',
            'C # not a heading',
            'C ```',
            '- ==out==',
        ]);
    });

    test('does not close a tilde fence with a backtick line', () => {
        expect(marked('~~~\n```\nx\n~~~\ny')).toEqual(['C ~~~', 'C ```', 'C x', 'C ~~~', '- y']);
    });

    test('recognises an indented fence', () => {
        expect(marked('text\n  ```\n  x\n  ```\ntext')).toEqual([
            '- text',
            'C   ```',
            'C   x',
            'C   ```',
            '- text',
        ]);
    });

    test('treats a nested-looking fence marker inside code as the closing fence', () => {
        // The scanner is line-oriented and always toggles on a delimiter of the
        // opening character, which is what every caller relied on before this
        // module existed.
        expect(marked('```\na\n```\nb\n```\nc')).toEqual(['C ```', 'C a', 'C ```', '- b', 'C ```', 'C c']);
    });

    test('an unterminated fence keeps the rest of the document in code', () => {
        expect(marked('```\na\n# heading')).toEqual(['C ```', 'C a', 'C # heading']);
    });

    test('preserves every line verbatim', () => {
        const source = 'a\n```\n  indented  \n```\n\ntrailing';
        expect(markCodeFenceLines(source).map(({line}) => line).join('\n')).toBe(source);
    });
});
