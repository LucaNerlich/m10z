import {beforeEach, describe, expect, test, vi} from 'vitest';

const readFile = vi.fn();

vi.mock('node:fs/promises', () => ({readFile}));

/**
 * The font promise is memoised at module scope, so each test needs a fresh copy
 * of the module (as it would in a fresh process).
 */
async function loadOgFont() {
    vi.resetModules();
    const mod = await import('./contentOgImage');
    return mod.loadOgFont;
}

beforeEach(() => {
    readFile.mockReset();
});

describe('loadOgFont', () => {
    test('reads the font once and reuses the promise', async () => {
        const load = await loadOgFont();
        readFile.mockResolvedValue(Buffer.from('font'));

        const [a, b] = await Promise.all([load(), load()]);

        expect(a.toString()).toBe('font');
        expect(b).toBe(a);
        expect(readFile).toHaveBeenCalledTimes(1);
    });

    test('a failed read is not cached, so the next render retries', async () => {
        const load = await loadOgFont();
        readFile.mockRejectedValueOnce(new Error('EMFILE'));
        readFile.mockResolvedValue(Buffer.from('font'));

        await expect(load()).rejects.toThrow('EMFILE');
        // Before the fix the rejected promise stayed memoised, so this call
        // rejected again without touching the filesystem.
        await expect(load()).resolves.toEqual(Buffer.from('font'));
        expect(readFile).toHaveBeenCalledTimes(2);
    });
});
