import {describe, expect, test} from 'vitest';

import {normalizeFileIdentity, resolveFileWithinPublicDir} from './durationFile';

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

describe('resolveFileWithinPublicDir', () => {
    const publicDir = '/srv/app/public';

    test('resolves a leading-slash relative URL inside the public dir', () => {
        expect(resolveFileWithinPublicDir(publicDir, '/uploads/a.mp3')).toBe('/srv/app/public/uploads/a.mp3');
    });

    test('resolves a URL without a leading slash', () => {
        expect(resolveFileWithinPublicDir(publicDir, 'uploads/a.mp3')).toBe('/srv/app/public/uploads/a.mp3');
    });

    test('returns null for path-traversal attempts', () => {
        expect(resolveFileWithinPublicDir(publicDir, '/../../etc/passwd')).toBeNull();
        expect(resolveFileWithinPublicDir(publicDir, '/uploads/../../../etc/passwd')).toBeNull();
    });
});
