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

const RAW_BR_RE = /<br\s*\/?>/gi;
const MARK_RE = /==([^=\n]+)==/g;
const INS_RE = /\+\+([^+\n]+)\+\+/g;
// Negative lookbehind avoids matching footnote refs like [^1]
const SUP_RE = /(?<!\[)\^([^\^\n]+)\^/g;
// Negative lookbehind/ahead avoids colliding with GFM `~~strike~~`
const SUB_RE = /(?<!~)~([^~\n]+)~(?!~)/g;

export function preprocessMarkdown(source: string): string {
    return source
        .replace(RAW_BR_RE, '')
        .replace(MARK_RE, '<mark>$1</mark>')
        .replace(INS_RE, '<ins>$1</ins>')
        .replace(SUP_RE, '<sup>$1</sup>')
        .replace(SUB_RE, '<sub>$1</sub>');
}
