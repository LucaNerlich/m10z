import {describe, expect, test} from 'vitest';

import {formatAuthorList} from './listFormatters';

describe('formatAuthorList', () => {
    test('empty array → no parts', () => {
        expect(formatAuthorList([])).toEqual([]);
    });

    test('single author → one element part', () => {
        expect(formatAuthorList(['Alice'])).toEqual([{type: 'element', value: 'Alice'}]);
    });

    test('two authors joined with German conjunction', () => {
        const parts = formatAuthorList(['Alice', 'Bob']);
        expect(parts.map((p) => p.value).join('')).toBe('Alice und Bob');
        expect(parts[0]).toEqual({type: 'element', value: 'Alice'});
        expect(parts[1].type).toBe('literal');
        expect(parts[1].value).toMatch(/und/);
        expect(parts[2]).toEqual({type: 'element', value: 'Bob'});
    });

    test('three+ authors → commas + final "und"', () => {
        const parts = formatAuthorList(['Alice', 'Bob', 'Charlie']);
        const elements = parts.filter((p) => p.type === 'element');
        const literals = parts.filter((p) => p.type === 'literal');

        expect(elements.map((e) => e.value)).toEqual(['Alice', 'Bob', 'Charlie']);
        expect(literals).toHaveLength(2);
        expect(literals[0].value).toContain(',');
        expect(literals[1].value).toMatch(/und/);
    });
});
