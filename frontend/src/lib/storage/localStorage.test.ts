import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {clearCache, getItem, removeItem, setItem} from './localStorage';

describe('localStorage utilities', () => {
    let store: Record<string, string> = {};

    beforeEach(() => {
        store = {};
        clearCache();
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
            }
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        clearCache();
    });

    describe('setItem', () => {
        test('stores serialized value', () => {
            setItem('key', {foo: 'bar'});
            expect(store['key']).toBe('{"foo":"bar"}');
        });

        test('stores array', () => {
            setItem('list', [1, 2, 3]);
            expect(store['list']).toBe('[1,2,3]');
        });

        test('stores string', () => {
            setItem('str', 'hello');
            expect(store['str']).toBe('"hello"');
        });
    });

    describe('getItem', () => {
        test('returns parsed value', () => {
            store['key'] = '{"foo":"bar"}';
            expect(getItem<{foo: string}>('key')).toEqual({foo: 'bar'});
        });

        test('returns null for missing key', () => {
            expect(getItem('nonexistent')).toBeNull();
        });

        test('returns null for corrupted JSON', () => {
            store['bad'] = '{broken';
            expect(getItem('bad')).toBeNull();
        });
    });

    describe('removeItem', () => {
        test('removes stored value', () => {
            store['key'] = 'value';
            removeItem('key');
            expect(store['key']).toBeUndefined();
        });

        test('no error when removing nonexistent key', () => {
            expect(() => removeItem('nonexistent')).not.toThrow();
        });
    });

    describe('round-trip', () => {
        test('set then get returns same value', () => {
            const data = {participants: [{id: '1', name: 'Alice', profileUrl: ''}]};
            setItem('roundtrip', data);
            const result = getItem<typeof data>('roundtrip');
            expect(result).toEqual(data);
        });
    });

    describe('localStorage throws', () => {
        beforeEach(() => {
            clearCache();
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
            setItem('key', 'value');
            expect(getItem<string>('key')).toBe('value');
        });

        test('getItem returns null for missing key', () => {
            expect(getItem('nonexistent')).toBeNull();
        });

        test('removeItem does not throw when localStorage fails', () => {
            setItem('key', 'value');
            removeItem('key');
            expect(getItem<string>('key')).toBeNull();
        });
    });

    describe('server-side (no window)', () => {
        beforeEach(() => {
            vi.unstubAllGlobals();
            clearCache();
        });

        test('setItem uses in-memory fallback', () => {
            setItem('key', 'value');
            expect(getItem<string>('key')).toBe('value');
        });

        test('removeItem works with in-memory fallback', () => {
            setItem('key', 'value');
            removeItem('key');
            expect(getItem<string>('key')).toBeNull();
        });
    });
});
