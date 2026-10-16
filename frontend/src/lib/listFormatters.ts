/**
 * Locale-aware list formatting utilities.
 */

/**
 * German locale identifier for list formatting.
 */
const GERMAN_LOCALE = 'de-DE';

// Hoisted: Intl construction (locale resolution) is the expensive part and every
// rendered card with authors calls formatAuthorList.
const germanListFormatter = new Intl.ListFormat(GERMAN_LOCALE, {
    type: 'conjunction',
    style: 'long',
});

/**
 * Formats an array of author names into locale-aware list parts using Intl.ListFormat.
 *
 * Uses German locale with conjunction type and long style to produce proper German
 * list formatting (e.g., "Alice, Bob und Charlie").
 *
 * @param authorNames - Array of author name strings to format
 * @returns Array of Intl.ListFormatPart objects with 'element' or 'literal' type
 *          and corresponding string values. Element parts represent the author names,
 *          literal parts represent separators and conjunctions.
 *
 * @example
 * ```ts
 * const parts = formatAuthorList(['Alice', 'Bob', 'Charlie']);
 * // Returns: [
 * //   { type: 'element', value: 'Alice' },
 * //   { type: 'literal', value: ', ' },
 * //   { type: 'element', value: 'Bob' },
 * //   { type: 'literal', value: ' und ' },
 * //   { type: 'element', value: 'Charlie' }
 * // ]
 * ```
 */
export function formatAuthorList(authorNames: string[]): {type: 'element' | 'literal'; value: string;}[] {
    return germanListFormatter.formatToParts(authorNames);
}

