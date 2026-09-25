import {toCalendarParts} from './statistikStats';

// Server-rendered only, but kept locale-independent anyway (explicit de-DE + fixed
// time zone) so output is identical on every machine.
const integerFormat = new Intl.NumberFormat('de-DE', {maximumFractionDigits: 0});
const decimalFormat = new Intl.NumberFormat('de-DE', {minimumFractionDigits: 1, maximumFractionDigits: 1});

export const GERMAN_MONTHS = [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
] as const;

export const GERMAN_MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const;

export const GERMAN_WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const;

export const GERMAN_WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;

export function formatInteger(value: number): string {
    return integerFormat.format(value);
}

export function formatDecimal(value: number): string {
    return decimalFormat.format(value);
}

/** 545714 → "151,6 Std." */
export function formatHours(seconds: number): string {
    return `${decimalFormat.format(seconds / 3600)} Std.`;
}

/** 3544 → "59 Min.", 9534 → "2 Std. 39 Min." */
export function formatMinutes(seconds: number): string {
    const totalMinutes = Math.round(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes} Min.`;
    return minutes === 0 ? `${hours} Std.` : `${hours} Std. ${minutes} Min.`;
}

/** `2026-01` → "Januar 2026" */
export function formatMonthKey(monthKey: string): string {
    const [year, month] = monthKey.split('-').map(Number);
    const name = GERMAN_MONTHS[month - 1];
    return name ? `${name} ${year}` : monthKey;
}

/** ISO timestamp → "17. Dezember 2018" (Berlin calendar day). */
export function formatCalendarDate(iso: string): string {
    const {year, month, day} = toCalendarParts(iso);
    return `${day}. ${GERMAN_MONTHS[month - 1]} ${year}`;
}

const timeFormat = new Intl.DateTimeFormat('de-DE', {timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit'});

/** ISO timestamp → "25. September 2026, 14:55 Uhr" */
export function formatSnapshotDate(iso: string): string {
    return `${formatCalendarDate(iso)}, ${timeFormat.format(new Date(iso))} Uhr`;
}

export function pluralize(count: number, singular: string, plural: string): string {
    return `${formatInteger(count)} ${count === 1 ? singular : plural}`;
}
