import {describe, expect, test} from 'vitest';

import {
    DOCUMENT_INVALIDATION,
    INVALIDATION_TARGETS,
    LIFECYCLE_INVALIDATION,
    isInvalidationTargetName,
} from '../../../shared/invalidation/manifest';

import {INVALIDATE_TARGETS} from '../utils/invalidateNextCache';

describe('cache invalidation contract (backend)', () => {
    test('INVALIDATE_TARGETS matches the shared manifest', () => {
        expect([...INVALIDATE_TARGETS].sort()).toEqual([...INVALIDATION_TARGETS].sort());
    });

    test('every DOCUMENT_INVALIDATION target is a known invalidation target', () => {
        for (const {targets} of Object.values(DOCUMENT_INVALIDATION)) {
            for (const target of targets) {
                expect(isInvalidationTargetName(target)).toBe(true);
            }
        }
    });

    test('every LIFECYCLE_INVALIDATION target is a known invalidation target', () => {
        for (const events of Object.values(LIFECYCLE_INVALIDATION)) {
            for (const targets of Object.values(events)) {
                for (const target of targets ?? []) {
                    expect(isInvalidationTargetName(target)).toBe(true);
                }
            }
        }
    });
});
