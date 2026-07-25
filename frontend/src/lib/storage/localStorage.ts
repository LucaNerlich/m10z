const inMemoryStore = new Map<string, string>();

export function getItem<T>(key: string): T | null {
    if (typeof window === 'undefined') {
        const value = inMemoryStore.get(key);
        if (value === undefined) return null;
        try { return JSON.parse(value) as T; } catch { return null; }
    }

    try {
        const item = window.localStorage.getItem(key);
        if (item !== null) {
            inMemoryStore.set(key, item);
            try { return JSON.parse(item) as T; } catch { return null; }
        }
    } catch {
        // localStorage unavailable, fall through to in-memory
    }

    const value = inMemoryStore.get(key);
    if (value !== undefined) {
        try { return JSON.parse(value) as T; } catch { return null; }
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

export function clearCache(): void {
    inMemoryStore.clear();
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
