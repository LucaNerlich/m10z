// @vitest-environment jsdom
import {afterEach, describe, expect, test} from 'vitest';

import {lockBodyScroll, resetBodyScrollLockForTests} from './bodyScrollLock';

afterEach(() => {
    resetBodyScrollLockForTests();
    document.body.style.overflow = '';
});

describe('lockBodyScroll', () => {
    test('keeps the lock until the last holder releases, then restores the original value', () => {
        document.body.style.overflow = 'auto';

        const releaseFirst = lockBodyScroll();
        const releaseSecond = lockBodyScroll();
        expect(document.body.style.overflow).toBe('hidden');

        // The first overlay closing must not unlock the page while the second is open.
        releaseFirst();
        expect(document.body.style.overflow).toBe('hidden');

        releaseSecond();
        expect(document.body.style.overflow).toBe('auto');
    });

    test('a release is idempotent', () => {
        document.body.style.overflow = 'scroll';

        const release = lockBodyScroll();
        release();
        release();

        expect(document.body.style.overflow).toBe('scroll');

        // A double release must not poison the holder count: the next lock still applies.
        const relock = lockBodyScroll();
        expect(document.body.style.overflow).toBe('hidden');
        relock();
        expect(document.body.style.overflow).toBe('scroll');
    });
});
