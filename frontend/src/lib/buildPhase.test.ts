import {afterEach, describe, expect, it, vi} from 'vitest';

import {isBuildPhase} from './buildPhase';

describe('isBuildPhase', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('is true during next build', () => {
        vi.stubEnv('NEXT_PHASE', 'phase-production-build');
        expect(isBuildPhase()).toBe(true);
    });

    it('is false at runtime', () => {
        vi.stubEnv('NEXT_PHASE', 'phase-production-server');
        expect(isBuildPhase()).toBe(false);
    });

    it('is false when unset', () => {
        vi.stubEnv('NEXT_PHASE', '');
        expect(isBuildPhase()).toBe(false);
    });
});
