export function isPastPublishDate(raw: string | null | undefined, nowTs = Date.now()): boolean {
    if (!raw) return false;
    const ts = new Date(raw).getTime();
    return Number.isFinite(ts) && ts <= nowTs;
}

export function filterPublished<T>(
    items: T[],
    getDate: (item: T) => string | null | undefined,
    nowTs = Date.now(),
): T[] {
    return items.filter((item) => isPastPublishDate(getDate(item), nowTs));
}

