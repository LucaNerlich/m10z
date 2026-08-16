const germanPluralRules = new Intl.PluralRules('de-DE');
// parseMonthDate builds a UTC instant, so formatters must render in UTC:
// without timeZone the label shifts one month back on servers west of UTC.
const germanLongDateFormatter = new Intl.DateTimeFormat('de-DE', {month: 'long', year: 'numeric', timeZone: 'UTC'});
const germanShortDateFormatter = new Intl.DateTimeFormat('de-DE', {month: 'long', year: '2-digit', timeZone: 'UTC'});
const germanCompactDateFormatter = new Intl.DateTimeFormat('de-DE', {month: 'short', year: '2-digit'});

function parseMonthDate(monthId: string): Date | null {
    const parsed = new Date(`${monthId}-01T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

/**
 * Format a vote count with correct German pluralization.
 * e.g. "1 Stimme", "5 Stimmen"
 */
export function formatVotes(votes: number): string {
    const rule = germanPluralRules.select(votes);
    const unit = rule === 'one' ? 'Stimme' : 'Stimmen';
    return `${votes} ${unit}`;
}

/**
 * Format a "YYYY-MM" month ID as a long German date.
 * e.g. "2025-12" -> "Dezember 2025"
 */
export function formatMonthLong(monthId: string): string {
    const date = parseMonthDate(monthId);
    return date ? germanLongDateFormatter.format(date) : monthId;
}

/**
 * Format a "YYYY-MM" month ID with a 2-digit year.
 * e.g. "2025-12" -> "Dezember 25"
 */
export function formatMonthShort(monthId: string): string {
    const date = parseMonthDate(monthId);
    return date ? germanShortDateFormatter.format(date) : monthId;
}

/**
 * Format a "YYYY-MM" month ID with abbreviated month and 2-digit year.
 * e.g. "2025-12" -> "Dez. 25"
 */
export function formatMonthCompact(monthId: string): string {
    const [year, month] = monthId.split('-').map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return monthId;
    return germanCompactDateFormatter.format(new Date(year, month - 1));
}
