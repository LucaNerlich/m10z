/**
 * Heading-ID slugging compatible with rehype-slug (github-slugger).
 *
 * The markdown renderer assigns heading IDs via rehype-slug, which slugs every
 * heading in document order and appends `-1`, `-2`, … suffixes to duplicates.
 * The table of contents needs the same algorithm to resolve DOM headings by
 * their generated IDs instead of by position.
 */

export function slugifyHeadingText(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/&/g, '-and-')
        .replace(/[^\p{L}\p{N}-]/gu, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * A github-slugger-compatible slugger with occurrence tracking. Call `slug()`
 * on headings in document order exactly once per heading; duplicates receive
 * `-1`, `-2`, … suffixes like rehype-slug assigns.
 */
export function createHeadingSlugger() {
    const occurrences = new Map<string, number>();

    return {
        slug(value: string): string {
            const base = slugifyHeadingText(value);
            const count = occurrences.get(base) ?? 0;
            occurrences.set(base, count + 1);
            return count === 0 ? base : `${base}-${count}`;
        },
    };
}
