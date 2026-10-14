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
 * interpreted - this is a line scanner, not a CommonMark parser.
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

const FENCE_PREFIXES = ['```', '~~~'];

function isFenceDelimiter(line: string): boolean {
    const trimmed = line.trimStart();
    return FENCE_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

/**
 * Split markdown into lines, tagging each as inside or outside a fenced code block.
 *
 * Inline code spans are deliberately not considered - that is each caller's job.
 */
export function markCodeFenceLines(markdown: string): MarkdownLine[] {
    let inFence = false;

    return markdown.split('\n').map((line) => {
        if (isFenceDelimiter(line)) {
            inFence = !inFence;
            return {line, inCode: true};
        }
        return {line, inCode: inFence};
    });
}
