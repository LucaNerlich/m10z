import {toDateTimestamp} from '@/src/lib/effectiveDate';

export function isPastPublishDate(raw: string | null | undefined, nowTs = Date.now()): boolean {
    const ts = toDateTimestamp(raw);
    return ts !== null && ts <= nowTs;
}

export function filterPublished<T>(
    items: T[],
    getDate: (item: T) => string | null | undefined,
    _nowTs = Date.now(),
): T[] {
    return items.filter((item) => {
        const ts = toDateTimestamp(getDate(item));
        return ts === null || Number.isFinite(ts);
    });
}

