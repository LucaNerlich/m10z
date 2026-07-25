const inMemoryStore = new Map<string, string>();

export function getItem<T>(key: string): T | null {
    if (typeof window === 'undefined') {
        const value = inMemoryStore.get(key);
        return value ? (JSON.parse(value) as T) : null;
    }
    try {
        const item = window.localStorage.getItem(key);
        if (item === null) return null;
        return JSON.parse(item) as T;
    } catch {
        const value = inMemoryStore.get(key);
        return value ? (JSON.parse(value) as T) : null;
    }
}

export function setItem<T>(key: string, value: T): void {
    const serialized = JSON.stringify(value);
    if (typeof window === 'undefined') {
        inMemoryStore.set(key, serialized);
        return;
    }
    try {
        window.localStorage.setItem(key, serialized);
    } catch {
        inMemoryStore.set(key, serialized);
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
