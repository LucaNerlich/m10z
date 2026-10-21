/**
 * Fenced-code-block awareness for the line-oriented markdown helpers.
 *
 * Three helpers (custom-syntax preprocessing, heading extraction, media-index
 * rewriting) each re-implemented the same fence toggle, and the copies had already
 * drifted apart. They must all agree: a rule like "custom syntax never runs inside
 * code" is only true if every consumer sees the same fences.
 *
 * Fences are matched the way these helpers always have: a line whose trimmed start
 * is ```` ``` ```` or `~~~`. Fence length, info strings and indented fences are not
 * interpreted - this is a line scanner, not a CommonMark parser. The one CommonMark
 * rule it does honour: a fence closes only with the character that opened it, so a
 * ```` ``` ```` block is not ended by a `~~~` line (or vice versa).
 */

export type MarkdownLine = {
    /** The original line, unchanged. */
    line: string;
    /**
     * True for a fence delimiter line and for every line between two of them.
     * Delimiter lines count as "in code" so callers that skip code leave the
     * delimiters alone, which is what all of them did before.
     */
    inCode: boolean;
};

const FENCE_CHARS = ['`', '~'] as const;

type FenceChar = (typeof FENCE_CHARS)[number];

/** The fence character a delimiter line opens/closes with, or null when it is not one. */
function fenceCharAt(line: string): FenceChar | null {
    const trimmed = line.trimStart();
    return FENCE_CHARS.find((char) => trimmed.startsWith(char.repeat(3))) ?? null;
}

/**
 * Split markdown into lines, tagging each as inside or outside a fenced code block.
 *
 * Inline code spans are deliberately not considered - that is each caller's job.
 */
export function markCodeFenceLines(markdown: string): MarkdownLine[] {
    // Track which character opened the fence, not a single boolean: CommonMark
    // closes a fence only with the same character that opened it.
    let open: FenceChar | null = null;

    return markdown.split('\n').map((line) => {
        const char = fenceCharAt(line);
        if (char !== null && (open === null || open === char)) {
            open = open === null ? char : null;
            return {line, inCode: true};
        }
        return {line, inCode: open !== null};
    });
}

/**
 * Matches inline code spans (`` `code` ``, ``` ``code`` ```), keeping the backtick
 * delimiters in the capture so the code survives a split.
 *
 * Limitation: a span whose closing delimiter uses a different number of backticks
 * than its opening one (CommonMark allows `` `a`b` ``) is not recognised.
 */
const INLINE_CODE_SPLIT_RE = /(`+[^`]*`+)/g;

/**
 * Apply `fn` to the parts of a line that are *not* inline code spans.
 *
 * `String.prototype.split` with a capturing group interleaves the delimiters, so the
 * odd indices are exactly the code spans.
 */
export function mapOutsideInlineCode(line: string, fn: (text: string) => string): string {
    return line
        .split(INLINE_CODE_SPLIT_RE)
        .map((part, index) => (index % 2 === 1 ? part : fn(part)))
        .join('');
}
