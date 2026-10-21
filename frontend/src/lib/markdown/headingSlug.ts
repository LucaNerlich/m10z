/**
 * Heading-ID slugging, delegated to `github-slugger` — the same implementation
 * rehype-slug uses.
 *
 * The markdown renderer assigns heading IDs via rehype-slug, which slugs every
 * heading in document order and appends `-1`, `-2`, … suffixes to duplicates. The
 * table of contents must resolve DOM headings by their generated IDs, so it has to
 * use the identical algorithm rather than a lookalike.
 *
 * This previously reimplemented the algorithm while claiming compatibility, and
 * diverged: it mapped `&` to `-and-` (github-slugger removes it), collapsed runs of
 * whitespace into one dash (github-slugger emits one per space) and collapsed
 * repeated dashes.
 */

import GithubSlugger from 'github-slugger';

/**
 * A slugger with occurrence tracking. Call `slug()` on headings in document order
 * exactly once per heading; duplicates receive `-1`, `-2`, … suffixes like
 * rehype-slug assigns.
 */
export function createHeadingSlugger(): {slug: (value: string) => string} {
    const slugger = new GithubSlugger();
    return {slug: (value: string) => slugger.slug(value)};
}
