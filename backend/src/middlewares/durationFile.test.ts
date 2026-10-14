import {describe, expect, test} from 'vitest';

import {normalizeFileIdentity} from './durationFile';

describe('normalizeFileIdentity', () => {
    test('returns null for falsy input', () => {
        expect(normalizeFileIdentity(null)).toBeNull();
        expect(normalizeFileIdentity(undefined)).toBeNull();
        expect(normalizeFileIdentity({})).toBeNull();
    });

    test('stringifies primitive ids', () => {
        expect(normalizeFileIdentity('abc')).toBe('abc');
        expect(normalizeFileIdentity(5)).toBe('5');
    });

    test('prefers documentId, then id, then url', () => {
        expect(normalizeFileIdentity({documentId: 'doc', id: 1, url: '/a'})).toBe('doc');
        expect(normalizeFileIdentity({id: 1, url: '/a'})).toBe('1');
        expect(normalizeFileIdentity({url: '/uploads/a.mp3'})).toBe('url:/uploads/a.mp3');
    });
});
