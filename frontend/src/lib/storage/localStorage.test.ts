import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

type LocalStorageModule = typeof import('./localStorage');
type StorageListener = (event: StorageEvent) => void;

// A fresh module instance per test: the in-memory mirror is module-private state,
// so re-importing is how a test gets a clean one (the previous `clearCache()`
// export existed only for this and cleared nothing else). `window` must exist
// before that import, otherwise the module never registers its listeners.
let api: LocalStorageModule;

describe('localStorage utilities', () => {
    let store: Record<string, string> = {};
    let listeners: Record<string, StorageListener[]> = {};

    beforeEach(async () => {
        store = {};
        listeners = {};
        vi.stubGlobal(
            'window',
            {
                localStorage: {
                    getItem: vi.fn((key: string) => store[key] ?? null),
                    setItem: vi.fn((key: string, value: string) => {
                        store[key] = value;
                    }),
                    removeItem: vi.fn((key: string) => {
                        delete store[key];
                    }),
                },
                addEventListener: vi.fn((type: string, listener: StorageListener) => {
                    (listeners[type] ??= []).push(listener);
                }),
            }
        );
        vi.resetModules();
        api = await import('./localStorage');
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('setItem', () => {
        test('stores serialized value', () => {
            api.setItem('key', {foo: 'bar'});
            expect(store['key']).toBe('{"foo":"bar"}');
        });

        test('stores array', () => {
            api.setItem('list', [1, 2, 3]);
            expect(store['list']).toBe('[1,2,3]');
        });

        test('stores string', () => {
            api.setItem('str', 'hello');
            expect(store['str']).toBe('"hello"');
        });
    });

    describe('getItem', () => {
        test('returns parsed value', () => {
            store['key'] = '{"foo":"bar"}';
            expect(api.getItem<{foo: string}>('key')).toEqual({foo: 'bar'});
        });

        test('returns null for missing key', () => {
            expect(api.getItem('nonexistent')).toBeNull();
        });

        test('returns null for corrupted JSON', () => {
            store['bad'] = '{broken';
            expect(api.getItem('bad')).toBeNull();
        });
    });

    describe('stale durable value with a newer mirror', () => {
        test('getItem returns the mirrored value when setItem failed after an older value was stored', () => {
            store['key'] = '"old"';
            // Prime the in-memory mirror from the durable store.
            expect(api.getItem<string>('key')).toBe('old');

            // Storage is full: the durable write fails while the mirror takes the new value.
            vi.mocked(window.localStorage.setItem).mockImplementation(() => {
                throw new Error('QuotaExceededError');
            });
            api.setItem('key', 'new');

            expect(store['key']).toBe('"old"');
            expect(api.getItem<string>('key')).toBe('new');
        });
    });

    describe('cross-tab invalidation', () => {
        test('a read before the queued storage event returns the durable value', () => {
            store['key'] = '"old"';
            // Prime the mirror from the durable store.
            expect(api.getItem<string>('key')).toBe('old');

            // Another tab writes; its `storage` event is queued but not delivered yet.
            store['key'] = '"new"';
            expect(api.getItem<string>('key')).toBe('new');

            expect(listeners['storage']).toHaveLength(1);
            for (const listener of listeners['storage'] ?? []) {
                listener({key: 'key'} as unknown as StorageEvent);
            }

            expect(api.getItem<string>('key')).toBe('new');
        });
    });

    describe('removeItem', () => {
        test('removes stored value', () => {
            store['key'] = 'value';
            api.removeItem('key');
            expect(store['key']).toBeUndefined();
        });

        test('no error when removing nonexistent key', () => {
            expect(() => api.removeItem('nonexistent')).not.toThrow();
        });
    });

    describe('round-trip', () => {
        test('set then get returns same value', () => {
            const data = {participants: [{id: '1', name: 'Alice', profileUrl: ''}]};
            api.setItem('roundtrip', data);
            const result = api.getItem<typeof data>('roundtrip');
            expect(result).toEqual(data);
        });
    });

    describe('localStorage throws', () => {
        beforeEach(() => {
            vi.stubGlobal('window', {
                localStorage: {
                    getItem: vi.fn(() => {
                        throw new Error('storage error');
                    }),
                    setItem: vi.fn(() => {
                        throw new Error('storage error');
                    }),
                    removeItem: vi.fn(() => {
                        throw new Error('storage error');
                    }),
                },
            });
        });

        test('setItem uses in-memory fallback', () => {
            api.setItem('key', 'value');
            expect(api.getItem<string>('key')).toBe('value');
        });

        test('getItem returns null for missing key', () => {
            expect(api.getItem('nonexistent')).toBeNull();
        });

        test('removeItem does not throw when localStorage fails', () => {
            api.setItem('key', 'value');
            api.removeItem('key');
            expect(api.getItem<string>('key')).toBeNull();
        });
    });

    describe('server-side (no window)', () => {
        beforeEach(() => {
            vi.unstubAllGlobals();
        });

        test('setItem uses in-memory fallback', () => {
            api.setItem('key', 'value');
            expect(api.getItem<string>('key')).toBe('value');
        });

        test('removeItem works with in-memory fallback', () => {
            api.setItem('key', 'value');
            api.removeItem('key');
            expect(api.getItem<string>('key')).toBeNull();
        });
    });
});
