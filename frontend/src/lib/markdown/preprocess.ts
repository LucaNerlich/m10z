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

function applyTransforms(line: string): string {
    return line
        .replace(RAW_BR_RE, '')
        .replace(MARK_RE, '<mark>$1</mark>')
        .replace(INS_RE, '<ins>$1</ins>')
        .replace(SUP_RE, '<sup>$1</sup>')
        .replace(SUB_RE, '<sub>$1</sub>');
}

export function preprocessMarkdown(source: string): string {
    const lines = source.split('\n');
    const result: string[] = [];
    let inCodeFence = false;

    // The custom syntax transforms must never run inside fenced code blocks:
    // `==x==` in a code sample would be displayed as the literal text
    // `<mark>x</mark>`, and real `<br>` tags in code would be silently deleted.
    for (const line of lines) {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
            inCodeFence = !inCodeFence;
            result.push(line);
            continue;
        }
        result.push(inCodeFence ? line : applyTransforms(line));
    }

    return result.join('\n');
}
