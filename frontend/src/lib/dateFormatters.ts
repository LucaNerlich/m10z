/**
 * German locale date formatting utilities.
 *
 * Provides functions for formatting dates in German locale (de-DE) with
 * support for short date formats and durations.
 *
 * Uses manual formatting instead of toLocaleDateString to ensure consistent
 * output on server and client regardless of locale configuration, preventing
 * React hydration mismatches.
 */

/**
 * German month names (abbreviated).
 */
const GERMAN_MONTHS_SHORT: readonly string[] = [
    'Jan.',
    'Feb.',
    'März',
    'Apr.',
    'Mai',
    'Juni',
    'Juli',
    'Aug.',
    'Sept.',
    'Okt.',
    'Nov.',
    'Dez.',
] as const;

/**
 * Europe/Berlin calendar-day formatter. The explicit time zone keeps server and
 * client output identical, so no hydration mismatch.
 */
const BERLIN_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
});

/**
 * Formats a Date object into German short date format manually.
 *
 * @param dateObj - Date object (must be valid, already parsed)
 * @returns Formatted date string in format "15. Jan. 2024"
 */
function formatGermanDateShort(dateObj: Date): string {
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth(); // 0-11
    const day = dateObj.getUTCDate();

    return `${day}. ${GERMAN_MONTHS_SHORT[month]} ${year}`;
}

/**
 * Parses a date string and resolves its Europe/Berlin calendar day as a UTC
 * date-only Date object, so the month table and formatGermanDateShort stay
 * unchanged.
 *
 * Strapi stores calendar dates entered at Berlin midnight as the previous day's
 * 23:00Z (winter) / 22:00Z (summer) timestamp, so the UTC calendar day can be
 * one behind the day the author intended. Formatting the instant in
 * Europe/Berlin recovers that day for midnight-convention dates and gives the
 * correct day for genuine late-night posts (e.g. 23:30Z in winter is already
 * 00:30 the next day in Berlin).
 *
 * @param date - Date string (ISO 8601 or any valid date string)
 * @returns Date object holding the Europe/Berlin calendar day at 00:00:00 UTC
 */
function parseDateAsBerlinDateOnly(date: string): Date {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return parsed;

    const parts = BERLIN_DATE_FORMATTER.formatToParts(parsed);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? '';

    return new Date(Date.UTC(Number(get('year')), Number(get('month')) - 1, Number(get('day'))));
}

/**
 * Formats a date string into a short German date format.
 *
 * Example: "15. Jan. 2024"
 *
 * @param date - Date string (ISO 8601 or any valid date string), or null/undefined
 * @returns Formatted date string, or '—' if date is invalid or missing
 */
export function formatDateShort(date: string | null | undefined): string {
    if (!date) return '—';
    const dateObj = parseDateAsBerlinDateOnly(date);
    if (Number.isNaN(dateObj.getTime())) return '—';

    return formatGermanDateShort(dateObj);
}

/**
 * Formats duration in seconds to a readable string (e.g., "1:23:45" or "23:45").
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string as "H:MM:SS" if hours > 0, otherwise "MM:SS"
 *
 * @example
 * formatDuration(3665) // Returns "1:01:05"
 * @example
 * formatDuration(125) // Returns "2:05"
 */
export function formatDuration(seconds: number): string {
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
