import {describe, expect, test} from 'vitest';

import {extractHeadings} from './extractHeadings';

describe('extractHeadings', () => {
    test('extracts ATX headings with their depth', () => {
        const md = '# One\n\n## Two\n\n### Three';
        expect(extractHeadings(md)).toEqual([
            {text: 'One', depth: 1},
            {text: 'Two', depth: 2},
            {text: 'Three', depth: 3},
        ]);
    });

    test('excludes headings deeper than maxDepth (default 3)', () => {
        expect(extractHeadings('#### Four')).toEqual([]);
        expect(extractHeadings('# One\n## Two', 1)).toEqual([{text: 'One', depth: 1}]);
    });

    test('ignores headings inside fenced code blocks', () => {
        const md = '# Real\n\n```\n# Not a heading\n```\n\n## Also real';
        expect(extractHeadings(md)).toEqual([
            {text: 'Real', depth: 1},
            {text: 'Also real', depth: 2},
        ]);
    });

    test('ignores headings inside tilde-fenced code blocks', () => {
        const md = '~~~\n# fake\n~~~\n# real';
        expect(extractHeadings(md)).toEqual([{text: 'real', depth: 1}]);
    });

    test('strips inline formatting from heading text', () => {
        expect(extractHeadings('## **Bold** and `code` and [link](https://x)')).toEqual([
            {text: 'Bold and code and link', depth: 2},
        ]);
    });

    test('parses headings with leading whitespace', () => {
        expect(extractHeadings('   ## Indented')).toEqual([{text: 'Indented', depth: 2}]);
    });

    test('skips lines that are not ATX headings', () => {
        expect(extractHeadings('Just a paragraph\nwith two lines')).toEqual([]);
    });
});
