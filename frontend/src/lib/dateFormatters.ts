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
 * This ensures consistent output regardless of locale configuration.
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
 * This ensures consistent output regardless of locale configuration.
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
 * This function treats UTC timestamps as calendar dates by extracting the YYYY-MM-DD
 * component from the UTC representation and creating a Date object from those components.
 * This ensures that dates display consistently regardless of the user's timezone.
 *
 * When dates are entered in Strapi as calendar dates (e.g., "Dec 28, 00:00" local time),
 * they may be stored as UTC timestamps from the previous day (e.g., "2025-12-27T23:00:00Z"
 * for Germany UTC+1). This function detects such cases and adjusts to show the intended
 * calendar date by checking if the UTC time is late in the day (22:00-23:59), which typically
 * indicates a date entered at midnight local time in a timezone ahead of UTC.
 *
 * @param date - Date string (ISO 8601 or any valid date string)
 * @returns Date object parsed as UTC date-only (time set to 00:00:00 UTC)
 */
function parseDateAsUtcDateOnly(date: string): Date {
    // Extract the date part (YYYY-MM-DD) from the string
    // Handles formats like: "2024-12-25", "2024-12-25T00:00:00", "2024-12-25T23:00:00Z", etc.
    const dateMatch = date.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z?)?/);
    if (dateMatch) {
        const [year, month, day] = dateMatch[1].split('-').map(Number);
        
        // If we have a time component, check if it's late in the day UTC (20:00-23:59)
        // This typically indicates a date entered at midnight local time in a timezone ahead of UTC
        // In such cases, we should interpret it as the next calendar day
        if (dateMatch[2] !== undefined) {
            const hour = parseInt(dateMatch[2], 10);
            // If hour is 20-23 UTC, this is likely a date entered at 00:00 local time
            // in a timezone 1-4 hours ahead of UTC (e.g., Germany UTC+1/UTC+2, or other European/African timezones)
            // Adjust to show the intended calendar date
            if (hour >= 20) {
                // Add one day to get the intended calendar date
                const adjustedDate = new Date(Date.UTC(year, month - 1, day + 1));
                return adjustedDate;
            }
        }
        
        // Parse as UTC date to avoid timezone shifts
        // This ensures "2024-12-25" always displays as December 25th regardless of timezone
        return new Date(Date.UTC(year, month - 1, day));
    }
    // Fallback to normal parsing if format is unexpected
    return new Date(date);
}

/**
 * Formats a date string into a full German date format.
 *
 * Treats UTC timestamps as calendar dates by using UTC component extraction,
 * ensuring dates display consistently regardless of user timezone.
 *
 * Uses manual formatting to ensure consistent output on server and client,
 * preventing React hydration mismatches.
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
 * Treats UTC timestamps as calendar dates by using UTC component extraction,
 * ensuring dates display consistently regardless of user timezone.
 *
 * Uses manual formatting to ensure consistent output on server and client,
 * preventing React hydration mismatches.
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
 * Treats UTC timestamps as calendar dates by using UTC component extraction,
 * ensuring dates display consistently regardless of user timezone. Relative date
 * calculations are based on calendar days, not time-of-day differences.
 *
 * Returns '—' for null, undefined, or unparseable date strings. For exact day offsets returns localized labels such as "heute", "gestern", or "morgen"; for other offsets returns a relative description (e.g., "vor 2 Tagen", "in 3 Wochen"). If relative formatting is unavailable or fails, falls back to the short German date format.
 *
 * WARNING: This function uses `new Date()` for the current time, which can cause
 * hydration mismatches if used during SSR. Only use this function in client-side
 * components or after hydration is complete.
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

    // Handle today, yesterday, tomorrow
    if (diffDays === 0) return 'heute';
    if (diffDays === -1) return 'gestern';
    if (diffDays === 1) return 'morgen';

    // Use Intl.RelativeTimeFormat for other relative dates
    try {
        const rtf = new Intl.RelativeTimeFormat(GERMAN_LOCALE, {numeric: 'auto'});
        const absDiffDays = Math.abs(diffDays);

        if (absDiffDays < 7) {
            return rtf.format(diffDays, 'day');
        } else if (absDiffDays < 30) {
            const diffWeeks = Math.round(diffDays / 7);
            return rtf.format(diffWeeks, 'week');
        } else if (absDiffDays < 365) {
            const diffMonths = Math.round(diffDays / 30);
            return rtf.format(diffMonths, 'month');
        } else {
            const diffYears = Math.round(diffDays / 365);
            return rtf.format(diffYears, 'year');
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
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} 🎶`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')} 🎶`;
}
