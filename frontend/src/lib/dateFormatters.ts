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
 * Parses a date string, extracting only the date part (YYYY-MM-DD) and parsing it as UTC
 * to avoid timezone shifts that would show the wrong day.
 *
 * When dates are entered in Strapi as calendar dates (e.g., "Dec 28, 00:00" local time),
 * they may be stored as UTC timestamps from the previous day (e.g., "2025-12-27T23:00:00Z"
 * for Germany UTC+1). Whole-hour UTC times of 22:00 or 23:00 are treated as dates
 * entered at midnight local time and adjusted forward to the intended calendar date.
 * Ordinary evening timestamps (20:00–21:59 UTC) are real and must not shift.
 *
 * @param date - Date string (ISO 8601 or any valid date string)
 * @returns Date object parsed as UTC date-only (time set to 00:00:00 UTC)
 */
function parseDateAsUtcDateOnly(date: string): Date {
    const dateMatch = date.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z?)?/);
    if (dateMatch) {
        const [year, month, day] = dateMatch[1].split('-').map(Number);

        if (dateMatch[2] !== undefined) {
            const hour = parseInt(dateMatch[2], 10);
            // Only a whole-hour 22:00 or 23:00 UTC can be a date entered at
            // midnight in a timezone ahead of UTC (Berlin is UTC+1 in winter,
            // UTC+2 in summer). Any other hour is a genuine timestamp.
            const isWholeHour = dateMatch[3] === '00' && dateMatch[4] === '00';
            if (hour >= 22 && isWholeHour) {
                // Date entered at midnight local time in a timezone ahead of UTC —
                // shift to the next calendar day.
                return new Date(Date.UTC(year, month - 1, day + 1));
            }
        }

        return new Date(Date.UTC(year, month - 1, day));
    }
    // Fallback to normal parsing if format is unexpected
    return new Date(date);
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
    const dateObj = parseDateAsUtcDateOnly(date);
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
