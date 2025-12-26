/**
 * German locale date formatting utilities.
 *
 * Provides functions for formatting dates in German locale (de-DE) with
 * support for full, short, and relative date formats.
 */

const GERMAN_LOCALE = 'de-DE';

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
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) return '—';

    return dateObj.toLocaleDateString(GERMAN_LOCALE, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
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
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) return '—';

    return dateObj.toLocaleDateString(GERMAN_LOCALE, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Produce a German human-friendly relative label for the given date.
 *
 * Returns '—' for null, undefined, or unparseable date strings. For exact day offsets returns localized labels such as "heute", "gestern", or "morgen"; for other offsets returns a relative description (e.g., "vor 2 Tagen", "in 3 Wochen"). If relative formatting is unavailable or fails, falls back to the short German date format.
 *
 * @param date - Date string (ISO 8601 or any valid date string), or null/undefined
 * @returns A German relative date string, or '—' for invalid input; may return a short formatted date on fallback
 */
export function formatDateRelative(date: string | null | undefined): string {
    if (!date) return '—';
    const dateObj = new Date(date);
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
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
