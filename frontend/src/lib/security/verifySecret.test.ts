import {describe, expect, test} from 'vitest';

import {verifySecret} from './verifySecret';

describe('verifySecret', () => {
    test('equal strings → true', () => {
        expect(verifySecret('shared-secret', 'shared-secret')).toBe(true);
    });

    test('unequal strings → false', () => {
        expect(verifySecret('mine', 'theirs')).toBe(false);
    });

    test('one prefix of the other (different lengths) → false', () => {
        // Guards against early-return-on-length-mismatch leaking the expected length.
        expect(verifySecret('abc', 'abcdef')).toBe(false);
        expect(verifySecret('abcdef', 'abc')).toBe(false);
    });

    test('null provided → false', () => {
        expect(verifySecret(null, 'secret')).toBe(false);
    });

    test('null expected → false', () => {
        expect(verifySecret('provided', null)).toBe(false);
    });

    test('both null → false', () => {
        expect(verifySecret(null, null)).toBe(false);
    });

    test('empty strings → false (treated as missing)', () => {
        expect(verifySecret('', '')).toBe(false);
        expect(verifySecret('', 'secret')).toBe(false);
        expect(verifySecret('secret', '')).toBe(false);
    });

    test('case sensitive', () => {
        expect(verifySecret('Secret', 'secret')).toBe(false);
    });
});
