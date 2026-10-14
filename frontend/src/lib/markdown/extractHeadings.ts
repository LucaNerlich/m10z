/**
 * Extract ATX headings from a markdown string.
 *
 * Parses lines starting with `#` characters (ATX headings) and returns
 * an array of heading objects with text and depth. The `maxDepth` parameter
 * controls how deep to extract (e.g. 3 means h1/h2/h3).
 *
 * Note: h1 headings in article markdown are demoted to h2 by the Heading
 * component, so depth values here reflect the raw markdown levels.
 */

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

export type HeadingItem = {
    text: string;
    depth: number;
};

/**
 * Parse ATX headings from markdown source.
 *
 * @param markdown - Raw markdown string
 * @param maxDepth - Maximum heading depth to include (default: 3, meaning h1-h3)
 * @returns Array of heading items with text and depth
 */
import {markCodeFenceLines} from './codeFences';

export function extractHeadings(markdown: string, maxDepth = 3): HeadingItem[] {
    const headings: HeadingItem[] = [];

    for (const {line, inCode} of markCodeFenceLines(markdown)) {
        if (inCode) continue;

        const trimmed = line.trimStart();

        const match = HEADING_REGEX.exec(trimmed);
        if (!match) continue;

        const depth = match[1].length;
        if (depth > maxDepth) continue;

        // Strip inline markdown formatting from heading text
        const text = match[2]
            .replace(/\*\*(.+?)\*\*/g, '$1') // bold
            .replace(/__(.+?)__/g, '$1') // bold alt
            .replace(/\*(.+?)\*/g, '$1') // italic
            .replace(/(?<!\w)_(.+?)_(?!\w)/g, '$1') // italic alt (preserve snake_case)
            .replace(/`(.+?)`/g, '$1') // inline code
            .replace(/~~(.+?)~~/g, '$1') // strikethrough
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
            .trim();

        if (text) {
            headings.push({text, depth});
        }
    }

    return headings;
}

/**
 * Depth a heading extracted by `extractHeadings` actually renders at.
 *
 * The Markdown renderer demotes `h1` to `h2` so the page keeps a single `h1`
 * (the article title) and leaves deeper levels untouched. A raw markdown
 * depth of 1 therefore renders as `h2`, the same level as a raw depth of 2.
 *
 * @param markdownDepth - Raw ATX heading depth (1-6) as returned by `extractHeadings`
 * @returns Rendered heading depth (2-6)
 */
export function renderedHeadingDepth(markdownDepth: number): number {
    return Math.max(markdownDepth, 2);
}
