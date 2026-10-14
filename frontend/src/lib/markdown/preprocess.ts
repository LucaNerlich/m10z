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
 * Matches inline code spans (`` `code` ``, ``` ``code`` ```), keeping the
 * backtick delimiters in the captured group so the code can be split without
 * losing them.
 */
const INLINE_CODE_SPLIT_RE = /(`+[^`]*`+)/g;

/**
 * Apply the transforms to the parts of a line that are *not* inline code spans.
 *
 * The transforms are text-level, so without this an inline span like
 * `` `a == b` `` lost its content (`` `` ``) and a documented literal such as
 * `` `<br>` `` was deleted. `String.prototype.split` with a capturing group
 * interleaves the delimiters, so the odd indices are exactly the code spans.
 *
 * Limitation: a span whose closing delimiter uses a different number of
 * backticks than its opening one (CommonMark allows `` `a`b` ``) is not
 * recognised.
 */
function applyTransformsOutsideInlineCode(line: string): string {
    return line
        .split(INLINE_CODE_SPLIT_RE)
        .map((part, index) => (index % 2 === 1 ? part : applyTransforms(part)))
        .join('');
}

export function preprocessMarkdown(source: string): string {
    // The custom syntax transforms must never run inside fenced code blocks or
    // inline code spans: `==x==` in a code sample would be displayed as the
    // literal text `<mark>x</mark>`, and real `<br>` tags in code would be
    // silently deleted. Fence detection is shared with the other markdown helpers.
    return markCodeFenceLines(source)
        .map(({line, inCode}) => (inCode ? line : applyTransformsOutsideInlineCode(line)))
        .join('\n');
}
