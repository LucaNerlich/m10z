const inMemoryStore = new Map<string, string>();

export function getItem<T>(key: string): T | null {
    // `setItem` always writes the in-memory mirror first, so the mirror is never
    // older than the durable store. Reading it first keeps a save that only reached
    // the mirror (e.g. a full localStorage quota) from being reverted to the older
    // value still held by localStorage.
    const mirror = inMemoryStore.get(key);
    if (mirror !== undefined) {
        try { return JSON.parse(mirror) as T; } catch { return null; }
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

    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(key, serialized);
    } catch {
        // in-memory fallback already set
    }
}

export function removeItem(key: string): void {
    inMemoryStore.delete(key);

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
        } else {
            inMemoryStore.delete(e.key);
        }
    });

    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') inMemoryStore.clear();
    });
}
