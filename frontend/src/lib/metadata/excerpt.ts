const DEFAULT_MAX_CHARS = 155;

const MARKDOWN_STRIPPERS: Array<[RegExp, string]> = [
    [/```[\s\S]*?```/g, ' '],
    [/`([^`]*)`/g, '$1'],
    [/!\[[^\]]*\]\([^)]*\)/g, ' '],
    [/\[([^\]]+)\]\([^)]*\)/g, '$1'],
    [/<[^>]+>/g, ' '],
    [/^>+\s?/gm, ''],
    [/^#{1,6}\s+/gm, ''],
    [/^\s*[-*+]\s+/gm, ''],
    [/^\s*\d+\.\s+/gm, ''],
    [/[*_~]+/g, ''],
];

export function stripMarkdown(input: string): string {
    let out = input;
    for (const [pattern, replacement] of MARKDOWN_STRIPPERS) {
        out = out.replace(pattern, replacement);
    }
    return out.replace(/\s+/g, ' ').trim();
}

function truncateAtBoundary(input: string, maxChars: number): string {
    if (input.length <= maxChars) return input;
    const slice = input.slice(0, maxChars + 1);
    const lastSpace = slice.lastIndexOf(' ');
    const cut = lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice.slice(0, maxChars);
    return `${cut.replace(/[\s.,;:!?-]+$/, '')}…`;
}

/**
 * Derive a short plain-text excerpt from Markdown for use as a meta description fallback.
 *
 * Returns `undefined` if the input is empty after stripping. The output never exceeds
 * `maxChars` plus the trailing ellipsis.
 */
export function deriveExcerpt(markdown: string | null | undefined, maxChars: number = DEFAULT_MAX_CHARS): string | undefined {
    if (!markdown) return undefined;
    const plain = stripMarkdown(markdown);
    if (!plain) return undefined;
    return truncateAtBoundary(plain, maxChars);
}
