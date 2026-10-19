const inMemoryStore = new Map<string, string>();

// Keys whose latest write never reached the durable store (quota exceeded, or no
// store at all server-side). Only these may be served from the mirror ahead of
// localStorage: for every other key the mirror is a cache, and a cross-tab
// `storage` event that invalidates it is delivered asynchronously, so a
// mirror-first read could return superseded state.
const unsyncedKeys = new Set<string>();

export function getItem<T>(key: string): T | null {
    if (unsyncedKeys.has(key)) {
        const mirror = inMemoryStore.get(key);
        if (mirror !== undefined) {
            try { return JSON.parse(mirror) as T; } catch { return null; }
        }
    }

    if (typeof window === 'undefined') return null;

    try {
        const item = window.localStorage.getItem(key);
        if (item !== null) {
            inMemoryStore.set(key, item);
            try { return JSON.parse(item) as T; } catch { return null; }
        }
    } catch {
        // localStorage unavailable, no in-memory value either
    }

    return null;
}

export function setItem<T>(key: string, value: T): void {
    const serialized = JSON.stringify(value);
    inMemoryStore.set(key, serialized);

    if (typeof window === 'undefined') {
        unsyncedKeys.add(key);
        return;
    }

    try {
        window.localStorage.setItem(key, serialized);
        unsyncedKeys.delete(key);
    } catch {
        // The mirror is the only place this write landed.
        unsyncedKeys.add(key);
    }
}

export function removeItem(key: string): void {
    inMemoryStore.delete(key);
    unsyncedKeys.delete(key);

    if (typeof window === 'undefined') return;

    try {
        window.localStorage.removeItem(key);
    } catch {
        // ignore
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === null) {
            inMemoryStore.clear();
            unsyncedKeys.clear();
        } else {
            inMemoryStore.delete(e.key);
            unsyncedKeys.delete(e.key);
        }
    });

    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Drop cached mirror entries only. An unsynced key's mirror value is
            // the authoritative copy of a write that never reached localStorage;
            // clearing it would silently lose the user's data on tab focus.
            for (const key of [...inMemoryStore.keys()]) {
                if (!unsyncedKeys.has(key)) inMemoryStore.delete(key);
            }
        }
    });
}
