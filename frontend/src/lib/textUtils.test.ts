import {describe, expect, test} from 'vitest';

import {getLineClampCSS} from './textUtils';

describe('getLineClampCSS', () => {
    test('returns the expected CSS shape', () => {
        expect(getLineClampCSS(3)).toEqual({
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 3,
            lineClamp: 3,
            overflow: 'hidden',
        });
    });

    test('clamps below 1 up to 1', () => {
        expect(getLineClampCSS(0).WebkitLineClamp).toBe(1);
        expect(getLineClampCSS(-5).WebkitLineClamp).toBe(1);
    });

    test('clamps above 10 down to 10', () => {
        expect(getLineClampCSS(20).WebkitLineClamp).toBe(10);
    });

    test('floors fractional input', () => {
        expect(getLineClampCSS(3.7).WebkitLineClamp).toBe(3);
    });
});
