import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchAuthorsList: vi.fn(),
}));

vi.mock('@/src/lib/strapiContent', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/src/lib/strapiContent')>();
    return {
        ...actual,
        fetchAuthorsList: mocks.fetchAuthorsList,
    };
});

import TeamPage from './page';

describe('TeamPage transient failure handling', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        mocks.fetchAuthorsList.mockReset();
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
        vi.unstubAllEnvs();
    });

    test('rethrows at runtime so ISR keeps the last good page', async () => {
        vi.stubEnv('NEXT_PHASE', 'phase-production-server');
        const failure = new Error('Strapi request failed: 500 Internal Server Error');
        mocks.fetchAuthorsList.mockRejectedValue(failure);

        await expect(TeamPage()).rejects.toBe(failure);
        expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    test('degrades to the retry panel during next build', async () => {
        vi.stubEnv('NEXT_PHASE', 'phase-production-build');
        mocks.fetchAuthorsList.mockRejectedValue(new Error('boom'));

        await expect(TeamPage()).resolves.toBeTruthy();
        expect(errorSpy).toHaveBeenCalledTimes(1);
    });
});
