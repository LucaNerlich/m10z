import {runInNewContext} from 'node:vm';

import {afterEach, describe, expect, test, vi} from 'vitest';

import {STALE_CHUNK_ERROR_SIGNATURES} from './errors';
import {
    claimStaleChunkReload,
    getStaleChunkListenerScript,
    installStaleChunkReloadListener,
    reloadForStaleChunk,
    STALE_CHUNK_RELOAD_COOLDOWN_MS,
    STALE_CHUNK_RELOAD_KEY,
    STALE_CHUNK_RELOADING_FLAG,
    type StaleChunkListenerConfig,
} from './staleChunkReload';

function createStorage(initial: Record<string, string> = {}) {
    const data = new Map(Object.entries(initial));
    return {
        getItem: vi.fn((key: string) => data.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            data.set(key, value);
        }),
        data,
    };
}

type Listener = (event: unknown) => void;

function createFakeWindow(storage = createStorage(), readyState = 'loading') {
    const listeners: Record<string, Listener[]> = {};
    const win = {
        addEventListener: vi.fn((type: string, listener: Listener) => {
            (listeners[type] ??= []).push(listener);
        }),
        sessionStorage: storage,
        location: {reload: vi.fn()},
        document: {readyState},
    };
    const dispatch = (type: string, event: unknown) => {
        for (const listener of listeners[type] ?? []) listener(event);
    };
    return {win, dispatch, storage};
}

const config: StaleChunkListenerConfig = {
    key: STALE_CHUNK_RELOAD_KEY,
    cooldownMs: STALE_CHUNK_RELOAD_COOLDOWN_MS,
    flag: STALE_CHUNK_RELOADING_FLAG,
    signatures: STALE_CHUNK_ERROR_SIGNATURES,
};

function chunkLoadError(): Error {
    const error = new Error('Failed to load chunk /_next/static/chunks/abc.js from module 1');
    error.name = 'ChunkLoadError';
    return error;
}

describe('claimStaleChunkReload', () => {
    test('allows the first reload and records a timestamp', () => {
        const storage = createStorage();
        expect(claimStaleChunkReload(storage, 1_000_000)).toBe(true);
        expect(storage.data.get(STALE_CHUNK_RELOAD_KEY)).toBe('1000000');
    });

    test('blocks a second reload within the cooldown (prevents loops)', () => {
        const storage = createStorage({[STALE_CHUNK_RELOAD_KEY]: '1000000'});
        expect(claimStaleChunkReload(storage, 1_000_000 + STALE_CHUNK_RELOAD_COOLDOWN_MS - 1)).toBe(false);
    });

    test('allows another reload after the cooldown (later deployment, same tab)', () => {
        const storage = createStorage({[STALE_CHUNK_RELOAD_KEY]: '1000000'});
        expect(claimStaleChunkReload(storage, 1_000_000 + STALE_CHUNK_RELOAD_COOLDOWN_MS)).toBe(true);
    });

    test('treats the legacy once-per-session marker "1" as expired', () => {
        const storage = createStorage({[STALE_CHUNK_RELOAD_KEY]: '1'});
        expect(claimStaleChunkReload(storage, Date.now())).toBe(true);
    });

    test('treats garbage and future timestamps as expired', () => {
        expect(claimStaleChunkReload(createStorage({[STALE_CHUNK_RELOAD_KEY]: 'abc'}), 5_000)).toBe(true);
        expect(claimStaleChunkReload(createStorage({[STALE_CHUNK_RELOAD_KEY]: '9000'}), 5_000)).toBe(true);
    });

    test('never reloads without usable storage', () => {
        expect(claimStaleChunkReload(null)).toBe(false);
        const throwing = {
            getItem: () => {
                throw new Error('SecurityError');
            },
            setItem: () => undefined,
        };
        expect(claimStaleChunkReload(throwing)).toBe(false);
    });
});

describe('reloadForStaleChunk', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('returns false on the server', () => {
        expect(reloadForStaleChunk()).toBe(false);
    });

    test('reloads once, then reports the in-flight reload without reloading again', () => {
        const {win} = createFakeWindow();
        vi.stubGlobal('window', win);
        expect(reloadForStaleChunk()).toBe(true);
        expect(reloadForStaleChunk()).toBe(true);
        expect(win.location.reload).toHaveBeenCalledTimes(1);
    });

    test('returns false when the cooldown blocks the reload', () => {
        const {win} = createFakeWindow(createStorage({[STALE_CHUNK_RELOAD_KEY]: String(Date.now())}));
        vi.stubGlobal('window', win);
        expect(reloadForStaleChunk()).toBe(false);
        expect(win.location.reload).not.toHaveBeenCalled();
    });
});

describe('installStaleChunkReloadListener', () => {
    test('reloads on an unhandled ChunkLoadError rejection', () => {
        const {win, dispatch} = createFakeWindow(createStorage(), 'complete');
        installStaleChunkReloadListener(win, config);
        dispatch('unhandledrejection', {reason: chunkLoadError()});
        expect(win.location.reload).toHaveBeenCalledTimes(1);
    });

    test('ignores unrelated rejections', () => {
        const {win, dispatch} = createFakeWindow(createStorage(), 'complete');
        installStaleChunkReloadListener(win, config);
        dispatch('unhandledrejection', {reason: new Error('Strapi request failed: 500')});
        dispatch('unhandledrejection', {reason: undefined});
        expect(win.location.reload).not.toHaveBeenCalled();
    });

    test('reloads on a failed /_next/static/ script during the initial load', () => {
        const {win, dispatch} = createFakeWindow();
        installStaleChunkReloadListener(win, config);
        dispatch('error', {target: {tagName: 'SCRIPT', src: 'https://m10z.de/_next/static/chunks/abc.js'}});
        expect(win.location.reload).toHaveBeenCalledTimes(1);
    });

    test('reloads on a failed /_next/static/ stylesheet during the initial load', () => {
        const {win, dispatch} = createFakeWindow();
        installStaleChunkReloadListener(win, config);
        dispatch('error', {target: {tagName: 'LINK', rel: 'stylesheet', href: '/_next/static/chunks/abc.css'}});
        expect(win.location.reload).toHaveBeenCalledTimes(1);
    });

    test('ignores third-party, preload and post-load resource failures', () => {
        const {win, dispatch} = createFakeWindow();
        installStaleChunkReloadListener(win, config);
        dispatch('error', {target: {tagName: 'SCRIPT', src: 'https://umami.m10z.de/script.js'}});
        dispatch('error', {target: {tagName: 'LINK', rel: 'preload', href: '/_next/static/chunks/abc.js'}});
        dispatch('error', {target: {tagName: 'IMG', src: '/_next/static/media/logo.png'}});
        win.document.readyState = 'complete';
        dispatch('error', {target: {tagName: 'SCRIPT', src: '/_next/static/chunks/abc.js'}});
        expect(win.location.reload).not.toHaveBeenCalled();
    });

    test('reloads on an uncaught chunk error event', () => {
        const {win, dispatch} = createFakeWindow(createStorage(), 'complete');
        installStaleChunkReloadListener(win, config);
        dispatch('error', {target: win, error: chunkLoadError()});
        expect(win.location.reload).toHaveBeenCalledTimes(1);
    });

    test('respects the cooldown and reloads at most once per page', () => {
        const {win, dispatch} = createFakeWindow(createStorage(), 'complete');
        installStaleChunkReloadListener(win, config);
        dispatch('unhandledrejection', {reason: chunkLoadError()});
        dispatch('unhandledrejection', {reason: chunkLoadError()});
        expect(win.location.reload).toHaveBeenCalledTimes(1);

        const blocked = createFakeWindow(createStorage({[STALE_CHUNK_RELOAD_KEY]: String(Date.now())}), 'complete');
        installStaleChunkReloadListener(blocked.win, config);
        blocked.dispatch('unhandledrejection', {reason: chunkLoadError()});
        expect(blocked.win.location.reload).not.toHaveBeenCalled();
    });
});

describe('getStaleChunkListenerScript', () => {
    test('is self-contained and works when run in an isolated context', () => {
        const {win, dispatch} = createFakeWindow(createStorage(), 'complete');
        // Runs our own static script (no external input) without module scope,
        // proving the serialized listener does not depend on outer bindings.
        runInNewContext(getStaleChunkListenerScript(), {window: win, Date, Number, String});
        expect(win.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
        dispatch('unhandledrejection', {reason: chunkLoadError()});
        expect(win.location.reload).toHaveBeenCalledTimes(1);
    });

    test('cannot close the surrounding <script> tag', () => {
        expect(getStaleChunkListenerScript()).not.toMatch(/<\/script/i);
    });
});
