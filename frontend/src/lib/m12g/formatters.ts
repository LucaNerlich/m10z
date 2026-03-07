const germanPluralRules = new Intl.PluralRules('de-DE');
const germanLongDateFormatter = new Intl.DateTimeFormat('de-DE', {month: 'long', year: 'numeric'});
const germanShortDateFormatter = new Intl.DateTimeFormat('de-DE', {month: 'long', year: '2-digit'});
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
    if (year === undefined || month === undefined) return monthId;
    return germanCompactDateFormatter.format(new Date(year, month - 1));
}
