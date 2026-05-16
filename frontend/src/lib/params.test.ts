import {describe, expect, test} from 'vitest';

import {parseCategoryParam, parsePageParam} from './params';

describe('parsePageParam', () => {
    test.each<[Record<string, string | string[] | undefined>, number]>([
        [{}, 1],
        [{page: undefined}, 1],
        [{page: '1'}, 1],
        [{page: '5'}, 5],
        [{page: '0'}, 1],
        [{page: '-3'}, 1],
        [{page: 'abc'}, 1],
        [{page: ''}, 1],
        [{page: '1.7'}, 1],
        [{page: '3.9'}, 3],
        [{page: '999'}, 999],
        [{page: ['2', '3']}, 2], // takes first element
    ])('%j → %i', (params, expected) => {
        expect(parsePageParam(params)).toBe(expected);
    });
});

describe('parseCategoryParam', () => {
    test('missing → null', () => {
        expect(parseCategoryParam({})).toBeNull();
        expect(parseCategoryParam({category: undefined})).toBeNull();
    });

    test('valid slug passes through', () => {
        expect(parseCategoryParam({category: 'gaming-news'})).toBe('gaming-news');
        expect(parseCategoryParam({category: 'a_b_c'})).toBe('a_b_c');
    });

    test('invalid slug → null (delegates to validateSlugSafe)', () => {
        expect(parseCategoryParam({category: '../etc/passwd'})).toBeNull();
        expect(parseCategoryParam({category: 'has spaces'})).toBeNull();
        expect(parseCategoryParam({category: ''})).toBeNull();
    });

    test('array-string takes first element', () => {
        expect(parseCategoryParam({category: ['first', 'second']})).toBe('first');
    });
});
