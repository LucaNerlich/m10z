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
        console.log('error', error);
        // Log error but return 0 - never throw
        // Note: strapi is not available in this pure function, so we can't log here
        // Errors will be logged in extractWordCount
        return 0;
    }
}

/**
 * Extract text content from Strapi richtext field.
 * Handles both string (markdown) and object (Strapi richtext format) formats.
 */
export function extractTextFromRichtext(richtext: any): string | null | undefined {
    if (!richtext) {
        return null;
    }

    // If it's already a string (markdown), return as-is
    if (typeof richtext === 'string') {
        return richtext;
    }

    // If it's an object (Strapi richtext format), try to extract text
    if (typeof richtext === 'object') {
        // Strapi v5 richtext might be stored as JSON with structure like { type: 'doc', content: [...] }
        // Try to serialize it to markdown/plain text
        try {
            // Check if it's a Strapi richtext object (ProseMirror/Strapi format)
            if (richtext.type === 'doc' && Array.isArray(richtext.content)) {
                // Recursively extract text from content nodes
                function extractFromNodes(nodes: any[]): string {
                    return nodes
                        .map((node) => {
                            if (node.type === 'text' && typeof node.text === 'string') {
                                return node.text;
                            }
                            if (node.content && Array.isArray(node.content)) {
                                return extractFromNodes(node.content);
                            }
                            // Handle paragraph nodes that might have text directly
                            if (node.text && typeof node.text === 'string') {
                                return node.text;
                            }
                            return '';
                        })
                        .filter((text) => text.length > 0)
                        .join(' ');
                }
                const extracted = extractFromNodes(richtext.content);
                return extracted.length > 0 ? extracted : null;
            }

            // Check if it's an array (some formats use arrays)
            if (Array.isArray(richtext)) {
                const extracted = richtext
                    .map((item) => {
                        if (typeof item === 'string') return item;
                        if (item && typeof item === 'object') {
                            if (item.text) return item.text;
                            if (item.content) return extractTextFromRichtext(item.content);
                        }
                        return '';
                    })
                    .filter((text) => text.length > 0)
                    .join(' ');
                return extracted.length > 0 ? extracted : null;
            }

            // If it has a toString method, try that
            if (typeof richtext.toString === 'function') {
                const str = richtext.toString();
                if (str && str !== '[object Object]') {
                    return str;
                }
            }

            // Last resort: JSON stringify (not ideal but better than nothing)
            // This will include JSON syntax, but countWords will handle it
            return JSON.stringify(richtext);
        } catch (error) {
            // If extraction fails, return null
            return null;
        }
    }

    return null;
}

export async function extractWordCount(
    strapi: any,
    data: any,
    contentType: 'article' | 'podcast',
): Promise<void> {
    try {
        let richtextValue: any;

        if (contentType === 'article') {
            richtextValue = data.content;
        } else if (contentType === 'podcast') {
            richtextValue = data.shownotes;
        } else {
            strapi.log.warn(`Unknown contentType for word count extraction: ${contentType}`);
            return;
        }

        // Extract text from richtext (handles both string and object formats)
        const content = extractTextFromRichtext(richtextValue);

        // Log for debugging
        if (richtextValue && typeof richtextValue !== 'string') {
            strapi.log.info(
                `Richtext is not a string for ${contentType} (${data.slug || 'new'}), type: ${typeof richtextValue}, value preview: ${JSON.stringify(richtextValue).substring(0, 200)}`,
            );
        }

        if (!richtextValue) {
            strapi.log.warn(
                `No richtext value found for ${contentType} (${data.slug || 'new'}), setting wordCount to 0`,
            );
            data.wordCount = 0;
            return;
        }

        if (!content) {
            strapi.log.warn(
                `Could not extract text from richtext for ${contentType} (${data.slug || 'new'}), type: ${typeof richtextValue}, setting wordCount to 0`,
            );
            data.wordCount = 0;
            return;
        }

        // Calculate wordCount using countWords function
        const wordCount = countWords(content);

        // Set wordCount in data object
        data.wordCount = wordCount;

        if (wordCount > 0) {
            strapi.log.info(
                `Calculated wordCount: ${wordCount} for ${contentType} (${data.slug || 'new'}), content length: ${content.length}`,
            );
        } else {
            // Log warning if we have content but got 0 words (might indicate extraction issue)
            strapi.log.warn(
                `WordCount is 0 for ${contentType} (${data.slug || 'new'}) but extracted content exists (length: ${content.length}), preview: ${content.substring(0, 100)}`,
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
                // Skip word count calculation if wordCount is already explicitly set in the data
                // This prevents the middleware from overwriting wordCount when it's being set directly
                // (e.g., by the cronjob or manual updates)
                if (data.wordCount !== undefined && data.wordCount !== null) {
                    // WordCount is already set, skip calculation
                    return next();
                }

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
