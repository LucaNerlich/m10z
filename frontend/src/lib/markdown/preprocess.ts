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

import {mapOutsideInlineCode, markCodeFenceLines} from './codeFences';

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
 * Regions of a line whose payload is a URL or an HTML attribute value rather than
 * prose: a link destination (`](…)`) and a double-quoted attribute value (`="…"`).
 * Rewriting `==` inside either produces broken Markdown or a corrupted attribute.
 */
const LITERAL_PAYLOAD_SPLIT_RE = /(\]\([^)\n]*\)|="[^"\n]*")/g;

/** Apply the transforms to prose only: not to inline code, link targets or attributes. */
function applyTransformsOutsideLiterals(line: string): string {
    return mapOutsideInlineCode(line, (prose) =>
        prose
            .split(LITERAL_PAYLOAD_SPLIT_RE)
            .map((part, index) => (index % 2 === 1 ? part : applyTransforms(part)))
            .join('')
    );
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
