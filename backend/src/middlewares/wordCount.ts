/**
 * Word count calculation middleware for articles and podcasts.
 *
 * Calculates wordCount from content (articles) or shownotes (podcasts)
 * and sets it in the data object before save.
 */

/**
 * Compute the number of words in markdown or richtext content.
 *
 * Returns 0 for null, empty, non-string input, or when an internal error occurs.
 *
 * @param content - Markdown or richtext string to count words in
 * @returns `0` for null, empty, non-string input, or on error; otherwise the number of words found
 */
export function countWords(content: string | null | undefined): number {
    try {
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return 0;
        }

        // Strip markdown syntax to extract plain text
        let text = content;

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
        return words.length;
    } catch (error) {
        // Log error but return 0 - never throw
        // Note: strapi is not available in this pure function, so we can't log here
        // Errors will be logged in extractWordCount
        return 0;
    }
}

/**
 * Compute the word count from an article's content or a podcast's shownotes and store it on the provided data object.
 *
 * Selects the source field based on `contentType`, sets `data.wordCount` to the computed number, and logs the result.
 * If `contentType` is unrecognized the function logs a warning and returns without modifying `data`.
 * On error the function logs the error and sets `data.wordCount` to 0.
 *
 * @param data - The entity data being saved; `wordCount` will be written to this object
 * @param contentType - Either `'article'` (uses `data.content`) or `'podcast'` (uses `data.shownotes`)
 */
export async function extractWordCount(
    strapi: any,
    data: any,
    contentType: 'article' | 'podcast',
): Promise<void> {
    try {
        let content: string | null | undefined;

        if (contentType === 'article') {
            content = data.content;
        } else if (contentType === 'podcast') {
            content = data.shownotes;
        } else {
            strapi.log.warn(`Unknown contentType for word count extraction: ${contentType}`);
            return;
        }

        // Calculate wordCount using countWords function
        const wordCount = countWords(content);

        // Set wordCount in data object
        data.wordCount = wordCount;

        if (wordCount > 0) {
            strapi.log.debug(
                `Calculated wordCount: ${wordCount} for ${contentType} (${data.slug || 'new'})`,
            );
        }
    } catch (error) {
        // Log error but don't throw - allow save operation to proceed
        strapi.log.error(`Error extracting word count for ${contentType}:`, error);
        // Set wordCount to 0 on error to ensure field is always set
        data.wordCount = 0;
    }
}

/**
 * Compute and attach a wordCount to article or podcast data before save operations, then continue the middleware chain.
 *
 * This middleware runs for create and update actions when the context uid refers to an article or podcast.
 *
 * @param context - Middleware context containing `uid`, `action`, and optional `params` (where `params.data` is the entity being saved)
 * @param next - The next middleware function to invoke
 * @returns The value returned by the next middleware
 */
export async function wordCountMiddleware(
    context: {uid: string; action: string; params?: any},
    next: () => Promise<unknown>,
): Promise<unknown> {
    try {
        // Only process articles and podcasts for create/update actions
        if (
            (context.uid === 'api::article.article' || context.uid === 'api::podcast.podcast') &&
            ['create', 'update'].includes(context.action)
        ) {
            const data = context.params?.data;
            if (data) {
                // Get strapi instance from context
                const strapiInstance = context.params?.strapi || strapi;
                // Determine contentType based on uid
                const contentType = context.uid === 'api::article.article' ? 'article' : 'podcast';
                await extractWordCount(strapiInstance, data, contentType);
            }
        }
    } catch (error) {
        // Log error but continue to next() - never block save operation
        // Note: strapi may not be available in context, so we can't always log
        // The error is already handled in extractWordCount
    }

    // Always call next() even if word count calculation failed
    return next();
}
