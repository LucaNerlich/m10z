import {getEffectiveDate, type PublishableWithContentDate} from '@/src/lib/effectiveDate';

import {toCalendarParts, toMonthKey} from './statistikStats';
import {type StatistikHeatmap} from './types';

const MONTH_PARAM = /^(\d{4})-(0[1-9]|1[0-2])$/;
const MIN_YEAR = 2000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type StatistikMonth = {
    /** `YYYY-MM` */
    key: string;
    year: number;
    /** 1–12 */
    month: number;
};

/** Validates a `YYYY-MM` route segment. Returns `null` for anything else. */
export function parseMonthParam(raw: string | null | undefined): StatistikMonth | null {
    if (typeof raw !== 'string') return null;
    const match = MONTH_PARAM.exec(raw);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year < MIN_YEAR) return null;
    return {key: toMonthKey(year, month), year, month};
}

/** True when the month lies after the current Berlin calendar month. */
export function isFutureMonth(month: StatistikMonth, now: Date = new Date()): boolean {
    const current = toCalendarParts(now.toISOString());
    return month.year * 12 + month.month > current.year * 12 + current.month;
}

/**
 * UTC window that safely contains the whole Berlin calendar month (Berlin is at most
 * UTC+2, so one day of padding on each side is plenty). Results must still be narrowed
 * with {@link isInMonth}, which applies the exact Berlin month boundaries.
 */
export function monthQueryWindow(month: StatistikMonth): {from: string; to: string} {
    const start = Date.UTC(month.year, month.month - 1, 1) - DAY_MS;
    const end = Date.UTC(month.year, month.month, 1) + DAY_MS;
    return {from: new Date(start).toISOString(), to: new Date(end).toISOString()};
}

/** Whether an item's effective date falls into the given Berlin calendar month. */
export function isInMonth(item: PublishableWithContentDate, month: StatistikMonth): boolean {
    const date = getEffectiveDate(item);
    if (!date || !Number.isFinite(new Date(date).getTime())) return false;
    const parts = toCalendarParts(date);
    return parts.year === month.year && parts.month === month.month;
}

/** `YYYY-MM` keys of every heatmap month with at least one release, oldest first. */
export function monthsWithContent(heatmap: StatistikHeatmap): string[] {
    return heatmap.rows
        .flatMap((row) => row.cells)
        .filter((cell) => cell.inRange && cell.total > 0)
        .map((cell) => cell.month)
        .sort();
}

/** Nearest earlier and later months with releases, relative to `key`. */
export function adjacentMonths(
    heatmap: StatistikHeatmap,
    key: string
): {previous: string | null; next: string | null} {
    const months = monthsWithContent(heatmap);
    const previous = months.filter((month) => month < key).at(-1) ?? null;
    const next = months.find((month) => month > key) ?? null;
    return {previous, next};
}
