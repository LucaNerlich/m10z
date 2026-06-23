import {describe, expect, test} from 'vitest';

import {categoryTitlesToKeywords, primaryCategoryTitle} from './keywords';

describe('primaryCategoryTitle', () => {
    test('returns undefined for missing or empty input', () => {
        expect(primaryCategoryTitle(undefined)).toBeUndefined();
        expect(primaryCategoryTitle([])).toBeUndefined();
    });

    test('returns the first non-empty trimmed title', () => {
        expect(primaryCategoryTitle([{slug: 'a', title: '  News  '}, {slug: 'b', title: 'Reviews'}])).toBe('News');
    });

    test('skips categories without a title', () => {
        expect(primaryCategoryTitle([{slug: 'a', title: ''}, {slug: 'b', title: 'Reviews'}])).toBe('Reviews');
    });
});

describe('categoryTitlesToKeywords', () => {
    test('returns undefined when there are no usable titles', () => {
        expect(categoryTitlesToKeywords(undefined)).toBeUndefined();
        expect(categoryTitlesToKeywords([{slug: 'a', title: ''}])).toBeUndefined();
    });

    test('joins unique titles with a comma, preserving order', () => {
        expect(
            categoryTitlesToKeywords([
                {slug: 'a', title: 'News'},
                {slug: 'b', title: 'Reviews'},
                {slug: 'c', title: 'News'},
            ]),
        ).toBe('News, Reviews');
    });
});
