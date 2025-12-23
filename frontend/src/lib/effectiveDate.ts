export type BaseWithDate = {date?: string | null} | null | undefined;

export type PublishableWithBase = {
    base?: BaseWithDate;
    publishedAt?: string | null;
};

function cleanDate(raw?: string | null): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function getEffectiveDate(item: PublishableWithBase | null | undefined): string | null {
    if (!item) return null;
    const override = cleanDate(item.base?.date);
    if (override) return override;
    const published = cleanDate(item.publishedAt);
    return published ?? null;
}

export function toDateTimestamp(raw?: string | null): number | null {
    if (!raw) return null;
    const ts = new Date(raw).getTime();
    return Number.isFinite(ts) ? ts : null;
}

