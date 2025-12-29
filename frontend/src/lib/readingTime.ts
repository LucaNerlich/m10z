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
export function calculateReadingTime(
    markdownOrWordCount: string | number | null | undefined,
): string {
    // Handle wordCount number (preferred, faster)
    if (typeof markdownOrWordCount === 'number') {
        const wordCount = markdownOrWordCount;
        if (wordCount <= 0) {
            return '< 1 Min. Lesezeit';
        }

        // Calculate reading time: 250 words per minute, rounded up
        const minutes = Math.ceil(wordCount / 250);

        // Return "< 1 min read" for content with < 1 minute reading time
        if (minutes < 1) {
            return '< 1 Min. Lesezeit';
        }

        // Return "X min read" for all other cases
        return `${minutes} Min. Lesezeit`;
    }

    // Handle markdown string (backward compatibility)
    if (typeof markdownOrWordCount === 'string') {
        const markdown = markdownOrWordCount;
        if (!markdown || markdown.trim().length === 0) {
            return '< 1 Min. Lesezeit';
        }
    } else {
        // null or undefined
        return '< 1 Min. Lesezeit';
    }

    // Fallback: process markdown (backward compatibility)
    const markdown = markdownOrWordCount as string;

    // Strip markdown syntax to extract plain text
    let text = markdown;

    // Remove fenced code blocks (```code```)
    text = text.replace(/```[\s\S]*?```/g, '');

    // Remove indented code blocks (4+ spaces at start of line)
    text = text.replace(/^ {4,}.*$/gm, '');

    // Remove inline code (`code`)
    text = text.replace(/`[^`]+`/g, '');

    // Remove images but keep alt text: ![alt](url) -> alt
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

    // Remove links but keep text: [text](url) -> text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove headers (# ## ### etc.)
    text = text.replace(/^#{1,6}\s+/gm, '');

    // Remove bold (**text** or __text__)
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');

    // Remove italic (*text* or _text_)
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');

    // Remove strikethrough (~~text~~)
    text = text.replace(/~~([^~]+)~~/g, '$1');

    // Remove list markers (-, *, +, 1., etc.)
    text = text.replace(/^[\s]*[-*+]\s+/gm, '');
    text = text.replace(/^\s*\d+\.\s+/gm, '');

    // Remove blockquote markers (>)
    text = text.replace(/^>\s+/gm, '');

    // Remove horizontal rules (---, ***, ___)
    text = text.replace(/^[-*_]{3,}$/gm, '');

    // Remove HTML tags if any
    text = text.replace(/<[^>]+>/g, '');

    // Remove extra whitespace and normalize
    text = text.replace(/\s+/g, ' ').trim();

    // Count words by splitting on whitespace and filtering empty strings
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    const wordCount = words.length;

    // Calculate reading time: 250 words per minute, rounded up
    const minutes = Math.ceil(wordCount / 250);

    // Return "< 1 min read" for content with < 1 minute reading time
    if (minutes < 1) {
        return '< 1 Min. Lesezeit';
    }

    // Return "X min read" for all other cases
    return `${minutes} Min. Lesezeit`;
}
