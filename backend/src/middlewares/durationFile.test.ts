import {describe, expect, test} from 'vitest';

import {hasFileIdentity, isSameFileReference} from './durationFile';

describe('hasFileIdentity', () => {
    test('false for falsy and empty values', () => {
        expect(hasFileIdentity(null)).toBe(false);
        expect(hasFileIdentity(undefined)).toBe(false);
        expect(hasFileIdentity('')).toBe(false);
        expect(hasFileIdentity({})).toBe(false);
        expect(hasFileIdentity([])).toBe(false);
    });

    test('true for primitive ids and populated references', () => {
        expect(hasFileIdentity('abc')).toBe(true);
        expect(hasFileIdentity(5)).toBe(true);
        expect(hasFileIdentity({documentId: 'doc', id: 1, url: '/a'})).toBe(true);
        expect(hasFileIdentity({url: '/uploads/a.mp3'})).toBe(true);
    });
});

describe('isSameFileReference', () => {
    const existing = {id: 7, documentId: 'doc-7', url: '/uploads/old.mp3'};

    test('matches a numeric id against the existing record id', () => {
        expect(isSameFileReference(existing, 7)).toBe(true);
        expect(isSameFileReference(existing, 8)).toBe(false);
    });

    test('matches a documentId string against the existing documentId', () => {
        expect(isSameFileReference(existing, 'doc-7')).toBe(true);
        expect(isSameFileReference(existing, 'doc-8')).toBe(false);
    });

    test('matches populated references by any shared identity', () => {
        expect(isSameFileReference(existing, {id: 7})).toBe(true);
        expect(isSameFileReference(existing, {documentId: 'doc-7'})).toBe(true);
        expect(isSameFileReference(existing, {url: '/uploads/old.mp3'})).toBe(true);
        expect(isSameFileReference(existing, {id: 8, documentId: 'doc-7'})).toBe(true);
    });

    test('does not treat different references as the same', () => {
        expect(isSameFileReference(existing, {id: 8, documentId: 'doc-8', url: '/new.mp3'})).toBe(
            false,
        );
        expect(isSameFileReference(existing, null)).toBe(false);
        expect(isSameFileReference(existing, [])).toBe(false);
    });

    test('does not match when the existing reference carries no identity', () => {
        expect(isSameFileReference({}, 7)).toBe(false);
        expect(isSameFileReference(null, 7)).toBe(false);
    });
});
