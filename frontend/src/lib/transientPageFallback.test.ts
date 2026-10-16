import {afterEach, describe, expect, test, vi} from 'vitest';

import {transientPageFallback} from './transientPageFallback';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('transientPageFallback', () => {
    test('rethrows outside the build phase', () => {
        vi.stubEnv('NEXT_PHASE', 'phase-production-server');
        const error = new Error('Strapi request timed out after 30000ms');

        expect(() => transientPageFallback(error, () => 'fallback')).toThrow(error);
    });

    test('returns the fallback during the build phase', () => {
        vi.stubEnv('NEXT_PHASE', 'phase-production-build');

        expect(transientPageFallback(new Error('boom'), () => 'fallback')).toBe('fallback');
    });

    test('does not evaluate the lazy fallback outside the build phase', () => {
        vi.stubEnv('NEXT_PHASE', 'phase-production-server');
        const fallback = vi.fn(() => 'fallback');

        expect(() => transientPageFallback(new Error('boom'), fallback)).toThrow();
        expect(fallback).not.toHaveBeenCalled();
    });
});
