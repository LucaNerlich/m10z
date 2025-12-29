/**
 * Locale-aware list formatting utilities.
 */

/**
 * German locale identifier for list formatting.
 */
export const GERMAN_LOCALE = 'de-DE';

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
    const formatter = new Intl.ListFormat(GERMAN_LOCALE, {
        type: 'conjunction',
        style: 'long',
    });

    return formatter.formatToParts(authorNames);
}

