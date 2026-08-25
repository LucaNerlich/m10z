/**
 * German locale date formatting utilities.
 *
 * Provides functions for formatting dates in German locale (de-DE) with
 * support for full, short, and relative date formats.
 *
 * Uses manual formatting instead of toLocaleDateString to ensure consistent
 * output on server and client regardless of locale configuration, preventing
 * React hydration mismatches.
 */

const GERMAN_LOCALE = 'de-DE';
const GERMAN_RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat(GERMAN_LOCALE, {numeric: 'auto'});

/**
 * German month names (full).
 */
const GERMAN_MONTHS_FULL: readonly string[] = [
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
 * Formats a Date object into German full date format manually.
 *
 * @param dateObj - Date object (must be valid, already parsed)
 * @returns Formatted date string in format "15. Januar 2024"
 */
function formatGermanDateFull(dateObj: Date): string {
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth(); // 0-11
    const day = dateObj.getUTCDate();

    return `${day}. ${GERMAN_MONTHS_FULL[month]} ${year}`;
}

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
 * for Germany UTC+1). Such late-evening UTC times (20:00-23:59) are treated as dates
 * entered at midnight local time and adjusted forward to the intended calendar date.
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
            if (hour >= 20) {
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
 * Formats a date string into a full German date format.
 *
 * Example: "15. Januar 2024"
 *
 * @param date - Date string (ISO 8601 or any valid date string), or null/undefined
 * @returns Formatted date string, or '—' if date is invalid or missing
 */
export function formatDateFull(date: string | null | undefined): string {
    if (!date) return '—';
    const dateObj = parseDateAsUtcDateOnly(date);
    if (Number.isNaN(dateObj.getTime())) return '—';

    return formatGermanDateFull(dateObj);
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
 * Produce a German human-friendly relative label for the given date.
 *
 * Relative date calculations are based on calendar days, not time-of-day
 * differences. For exact day offsets returns localized labels such as "heute",
 * "gestern", or "morgen"; for other offsets returns a relative description
 * (e.g., "vor 2 Tagen", "in 3 Wochen"). Falls back to the short German date
 * format if relative formatting is unavailable or fails.
 *
 * WARNING: Uses `new Date()` for the current time, which can cause hydration
 * mismatches during SSR. Only use in client-side components or after hydration.
 *
 * @param date - Date string (ISO 8601 or any valid date string), or null/undefined
 * @returns A German relative date string, or '—' for invalid input; may return a short formatted date on fallback
 */
export function formatDateRelative(date: string | null | undefined): string {
    if (!date) return '—';
    const dateObj = parseDateAsUtcDateOnly(date);
    if (Number.isNaN(dateObj.getTime())) return '—';

    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'heute';
    if (diffDays === -1) return 'gestern';
    if (diffDays === 1) return 'morgen';

    try {
        const absDiffDays = Math.abs(diffDays);

        if (absDiffDays < 7) {
            return GERMAN_RELATIVE_TIME_FORMATTER.format(diffDays, 'day');
        } else if (absDiffDays < 30) {
            const diffWeeks = Math.round(diffDays / 7);
            return GERMAN_RELATIVE_TIME_FORMATTER.format(diffWeeks, 'week');
        } else if (absDiffDays < 365) {
            const diffMonths = Math.round(diffDays / 30);
            return GERMAN_RELATIVE_TIME_FORMATTER.format(diffMonths, 'month');
        } else {
            const diffYears = Math.round(diffDays / 365);
            return GERMAN_RELATIVE_TIME_FORMATTER.format(diffYears, 'year');
        }
    } catch {
        // Fallback to short date format if RelativeTimeFormat fails
        return formatDateShort(date);
    }
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
