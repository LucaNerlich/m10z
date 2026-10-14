import {describe, expect, test} from 'vitest';

import {resolveFileWithinPublicDir} from './resolveFileWithinPublicDir';

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

    test('returns null for sibling directories sharing the public dir name as a prefix', () => {
        expect(resolveFileWithinPublicDir(publicDir, '../public-evil/x.mp3')).toBeNull();
        expect(resolveFileWithinPublicDir(publicDir, '/../public-evil/x.mp3')).toBeNull();
    });

    test('returns null for sibling directories with a common suffix prefix', () => {
        expect(resolveFileWithinPublicDir(publicDir, '../public2/x.mp3')).toBeNull();
    });

    test('allows the public dir itself', () => {
        expect(resolveFileWithinPublicDir(publicDir, '')).toBe('/srv/app/public');
    });
});
