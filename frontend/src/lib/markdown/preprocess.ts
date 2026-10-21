/**
 * Pre-processor for custom inline Markdown syntax that ReactMarkdown's
 * remark/rehype pipeline doesn't handle natively.
 *
 * Run before passing the source to ReactMarkdown.
 *
 * Supported transforms:
 *   ==text==   →  <mark>text</mark>
 *   ++text++   →  <ins>text</ins>
 *   ^text^     →  <sup>text</sup>   (footnote refs `[^…]` are preserved)
 *   ~text~     →  <sub>text</sub>   (GFM `~~strike~~` is preserved)
 *
 * Inline `<br>` tags are stripped — ReactMarkdown handles line breaks via `\n`
 * already, and stray `<br>`s tend to introduce large gaps.
 */

import {markCodeFenceLines} from './codeFences';

const RAW_BR_RE = /<br\s*\/?>/gi;
const MARK_RE = /==([^=\n]+)==/g;
const INS_RE = /\+\+([^+\n]+)\+\+/g;
// Negative lookbehind avoids matching footnote refs like [^1]
const SUP_RE = /(?<!\[)\^([^\^\n]+)\^/g;
// Negative lookbehind/ahead avoids colliding with GFM `~~strike~~`
const SUB_RE = /(?<!~)~([^~\n]+)~(?!~)/g;

function applyTransforms(line: string): string {
    return line
        .replace(RAW_BR_RE, '')
        .replace(MARK_RE, '<mark>$1</mark>')
        .replace(INS_RE, '<ins>$1</ins>')
        .replace(SUP_RE, '<sup>$1</sup>')
        .replace(SUB_RE, '<sub>$1</sub>');
}

/**
 * Sentinel used to hide a protected region while the transforms run. It contains
 * none of the characters the transforms match, so a delimiter pair can still span
 * across a protected region.
 */
const MASK = '\u0000';

/**
 * Hide the regions whose payload must survive verbatim: inline code spans, link
 * destinations (`](…)`, balanced parentheses allowed) and double-quoted attribute
 * values (`="…"`).
 *
 * The regions are replaced with index-carrying sentinels rather than split apart,
 * because the transforms work on delimiter pairs: `==a [link](u) b==` must still
 * become a `<mark>` around the whole run, even though the destination is opaque.
 */
function maskProtectedRegions(line: string): {masked: string; payloads: string[]} {
    const payloads: string[] = [];
    let masked = '';
    let i = 0;

    const stash = (end: number) => {
        masked += `${MASK}${payloads.length}${MASK}`;
        payloads.push(line.slice(i, end));
        i = end;
    };

    while (i < line.length) {
        const char = line[i];

        // Inline code span: opened and closed by runs of the same number of backticks.
        if (char === '`') {
            let run = 0;
            while (line[i + run] === '`') run++;
            const fence = '`'.repeat(run);
            const close = line.indexOf(fence, i + run);
            if (close !== -1) {
                stash(close + run);
                continue;
            }
        }

        // Link destination, with balanced parentheses and backslash escapes.
        if (char === ']' && line[i + 1] === '(') {
            let depth = 1;
            let j = i + 2;
            while (j < line.length && depth > 0) {
                if (line[j] === '\\') {
                    j += 2;
                    continue;
                }
                if (line[j] === '(') depth++;
                else if (line[j] === ')') depth--;
                j++;
            }
            if (depth === 0) {
                stash(j);
                continue;
            }
        }

        // Double-quoted HTML attribute value.
        if (char === '=' && line[i + 1] === '"') {
            const close = line.indexOf('"', i + 2);
            if (close !== -1) {
                stash(close + 1);
                continue;
            }
        }

        masked += char;
        i++;
    }

    return {masked, payloads};
}

/** Apply the transforms to prose only, leaving every masked region byte-identical. */
function applyTransformsOutsideLiterals(line: string): string {
    const {masked, payloads} = maskProtectedRegions(line);
    const transformed = applyTransforms(masked).replace(
        new RegExp(`${MASK}(\\d+)${MASK}`, 'g'),
        (_, index: string) => payloads[Number(index)]
    );
    return transformed;
}

export function preprocessMarkdown(source: string): string {
    // The custom syntax transforms must never run inside fenced code blocks,
    // inline code spans, link destinations or attribute values: `==x==` in a code
    // sample would be displayed as the literal text `<mark>x</mark>`, real `<br>`
    // tags in code would be silently deleted, and a `?a==b==` query string would
    // stop being a valid URL. Fence detection is shared with the other helpers.
    return markCodeFenceLines(source)
        .map(({line, inCode}) => (inCode ? line : applyTransformsOutsideLiterals(line)))
        .join('\n');
}
