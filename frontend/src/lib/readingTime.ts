/**
 * Calculates estimated reading time from markdown content or word count.
 *
 * If wordCount is provided (number), calculates directly.
 * If markdown is provided (string), strips markdown syntax and counts words.
 * Estimates reading time using 250 words per minute (WPM) as the standard reading speed.
 *
 * @param markdownOrWordCount - The markdown content string or word count number to analyze
 * @returns Formatted reading time string: "< 1 Min. Lesezeit" or "X Min. Lesezeit"
 */

// Module-level cache for repeated function calls
const readingTimeCache = new Map<string | number, string>();

// Hoist RegExp patterns to module scope
const REGEX_FENCED_CODE_BLOCKS = /```[\s\S]*?```/g;
const REGEX_INDENTED_CODE_BLOCKS = /^ {4,}.*$/gm;
const REGEX_INLINE_CODE = /`[^`]+`/g;
const REGEX_IMAGES = /!\[([^\]]*)\]\([^)]+\)/g;
const REGEX_LINKS = /\[([^\]]+)\]\([^)]+\)/g;
const REGEX_HEADERS = /^#{1,6}\s+/gm;
const REGEX_BOLD_ASTERISK = /\*\*([^*]+)\*\*/g;
const REGEX_BOLD_UNDERSCORE = /__([^_]+)__/g;
const REGEX_ITALIC_ASTERISK = /\*([^*]+)\*/g;
const REGEX_ITALIC_UNDERSCORE = /_([^_]+)_/g;
const REGEX_STRIKETHROUGH = /~~([^~]+)~~/g;
const REGEX_LIST_MARKERS_UNORDERED = /^[\s]*[-*+]\s+/gm;
const REGEX_LIST_MARKERS_ORDERED = /^\s*\d+\.\s+/gm;
const REGEX_BLOCKQUOTES = /^>\s+/gm;
const REGEX_HORIZONTAL_RULES = /^[-*_]{3,}$/gm;
const REGEX_HTML_TAGS = /<[^>]+>/g;
const REGEX_WHITESPACE = /\s+/g;
const REGEX_WORD_SPLIT = /\s+/;

export function calculateReadingTime(
    markdownOrWordCount: string | number | null | undefined,
): string {
    // Check cache first
    if (markdownOrWordCount !== null && markdownOrWordCount !== undefined) {
        const cached = readingTimeCache.get(markdownOrWordCount);
        if (cached !== undefined) {
            return cached;
        }
    }

    let result: string;

    // Handle wordCount number (preferred, faster)
    if (typeof markdownOrWordCount === 'number') {
        const wordCount = markdownOrWordCount;
        if (wordCount <= 0) {
            result = '< 1 Min. Lesezeit';
        } else {
            // Calculate reading time: 250 words per minute, rounded up
            const minutes = Math.ceil(wordCount / 250);

            // Return "< 1 min read" for content with < 1 minute reading time
            if (minutes < 1) {
                result = '< 1 Min. Lesezeit';
            } else {
                // Return "X min read" for all other cases
                result = `~${minutes} Min. Lesezeit`;
            }
        }
    } else if (typeof markdownOrWordCount === 'string') {
        // Handle markdown string (backward compatibility)
        const markdown = markdownOrWordCount;
        if (!markdown || markdown.trim().length === 0) {
            result = '< 1 Min. Lesezeit';
        } else {
            // Strip markdown syntax to extract plain text
            let text = markdown;

            // Remove fenced code blocks (```code```)
            text = text.replace(REGEX_FENCED_CODE_BLOCKS, '');

            // Remove indented code blocks (4+ spaces at start of line)
            text = text.replace(REGEX_INDENTED_CODE_BLOCKS, '');

            // Remove inline code (`code`)
            text = text.replace(REGEX_INLINE_CODE, '');

            // Remove images but keep alt text: ![alt](url) -> alt
            text = text.replace(REGEX_IMAGES, '$1');

            // Remove links but keep text: [text](url) -> text
            text = text.replace(REGEX_LINKS, '$1');

            // Remove headers (# ## ### etc.)
            text = text.replace(REGEX_HEADERS, '');

            // Remove bold (**text** or __text__)
            text = text.replace(REGEX_BOLD_ASTERISK, '$1');
            text = text.replace(REGEX_BOLD_UNDERSCORE, '$1');

            // Remove italic (*text* or _text_)
            text = text.replace(REGEX_ITALIC_ASTERISK, '$1');
            text = text.replace(REGEX_ITALIC_UNDERSCORE, '$1');

            // Remove strikethrough (~~text~~)
            text = text.replace(REGEX_STRIKETHROUGH, '$1');

            // Remove list markers (-, *, +, 1., etc.)
            text = text.replace(REGEX_LIST_MARKERS_UNORDERED, '');
            text = text.replace(REGEX_LIST_MARKERS_ORDERED, '');

            // Remove blockquote markers (>)
            text = text.replace(REGEX_BLOCKQUOTES, '');

            // Remove horizontal rules (---, ***, ___)
            text = text.replace(REGEX_HORIZONTAL_RULES, '');

            // Remove HTML tags if any
            text = text.replace(REGEX_HTML_TAGS, '');

            // Remove extra whitespace and normalize
            text = text.replace(REGEX_WHITESPACE, ' ').trim();

            // Count words by splitting on whitespace and filtering empty strings
            const words = text.split(REGEX_WORD_SPLIT).filter((word) => word.length > 0);
            const wordCount = words.length;

            // Calculate reading time: 250 words per minute, rounded up
            const minutes = Math.ceil(wordCount / 250);

            // Return "< 1 min read" for content with < 1 minute reading time
            if (minutes < 1) {
                result = '< 1 Min. Lesezeit';
            } else {
                // Return "X min read" for all other cases
                result = `~${minutes} Min. Lesezeit`;
            }
        }
    } else {
        // null or undefined
        result = '< 1 Min. Lesezeit';
    }

    // Cache the result
    if (markdownOrWordCount !== null && markdownOrWordCount !== undefined) {
        readingTimeCache.set(markdownOrWordCount, result);
    }

    return result;
}
