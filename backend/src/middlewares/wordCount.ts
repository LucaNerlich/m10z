/**
 * Word count calculation middleware for articles and podcasts.
 *
 * Calculates wordCount from content (articles) or shownotes (podcasts)
 * and sets it in the data object before save.
 */

import type {
    DocumentServiceContext,
    DocumentServiceNext,
    StrapiInstance,
    RichTextBlock,
    ArticleDocument,
    PodcastDocument,
} from '../types/middleware';

/**
 * Compute the number of words in markdown or richtext content.
 *
 * Returns 0 for null, empty, or non-string input.
 *
 * @param content - Markdown or richtext string to count words in
 * @returns `0` for null, empty, or non-string input; otherwise the number of words found
 */
export function countWords(content: string | null | undefined): number {
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

    // Remove bold (**text** or __text__). The underscore variants must not match
    // inside snake_case identifiers, so they only count as emphasis when the
    // underscores are bounded by non-word characters (or string boundaries).
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/(^|\W)__([^_]+)__(?=\W|$)/g, '$1$2');

    // Remove italic (*text* or _text_)
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1$2');

    // Remove strikethrough (~~text~~)
    text = text.replace(/~~([^~]+)~~/g, '$1');

    // Remove list markers (-, *, +, 1., etc.)
    text = text.replace(/^[\s]*[-*+]\s+/gm, '');
    text = text.replace(/^\s*\d+\.\s+/gm, '');

    // Remove blockquote markers (>)
    text = text.replace(/^>\s+/gm, '');

    // Remove horizontal rules (---, ***, ___)
    text = text.replace(/^[-*_]{3,}$/gm, '');

    // Remove HTML tags if any — the tag-name requirement keeps comparison
    // operators like `3 < 4` from being swallowed as a fake tag.
    text = text.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, '');

    // Remove extra whitespace and normalize
    text = text.replace(/\s+/g, ' ').trim();

    // Count words by splitting on whitespace and filtering empty strings
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    return words.length;
}

/**
 * Extract text content from Strapi richtext field.
 * Handles both string (markdown) and object (Strapi richtext format) formats.
 */
export function extractTextFromRichtext(
    richtext: string | RichTextBlock | RichTextBlock[] | null | undefined
): string | null | undefined {
    if (!richtext) {
        return null;
    }

    if (typeof richtext === 'string') {
        return richtext;
    }

    // If it's an object (Strapi richtext format), try to extract text
    if (!Array.isArray(richtext) && typeof richtext === 'object') {
        // Strapi v5 richtext might be stored as JSON with structure like { type: 'doc', content: [...] }
        // Try to serialize it to markdown/plain text
        try {
            if (richtext.type === 'doc' && Array.isArray(richtext.content)) {
                // Recursively extract text from content nodes
                function extractFromNodes(nodes: RichTextBlock[]): string {
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

            // If it has a toString method, try that
            if (typeof richtext.toString === 'function') {
                const str = richtext.toString();
                if (str && str !== '[object Object]') {
                    return str;
                }
            }

            // Last resort: JSON syntax inflates the count slightly, but countWords tolerates it.
            return JSON.stringify(richtext);
        } catch {
            // If extraction fails, return null
            return null;
        }
    }

    // Check if it's an array of blocks (some formats use plain block arrays)
    try {
        const extracted = richtext
            .map((item) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') {
                    if (item.text) return item.text;
                    if (item.content) return extractTextFromRichtext(item.content) ?? '';
                }
                return '';
            })
            .filter((text) => typeof text === 'string' && text.length > 0)
            .join(' ');
        return extracted.length > 0 ? extracted : null;
    } catch {
        // If extraction fails, return null
        return null;
    }
}

const RICHTEXT_FIELD = {
    article: 'content',
    podcast: 'shownotes',
} as const;

/**
 * Returns true when the payload includes the body richtext field (even if null/empty).
 * Strapi updates often send only changed keys; missing keys must not trigger a wordCount reset.
 */
function hasRichtextFieldInPayload(
    data: ArticleDocument | PodcastDocument,
    contentType: 'article' | 'podcast',
): boolean {
    const key = RICHTEXT_FIELD[contentType];
    return Object.prototype.hasOwnProperty.call(data, key);
}

/**
 * Sets `data.wordCount` from `content` (articles) or `shownotes` (podcasts).
 * If the payload omits that field (partial update), does not modify `wordCount` — required so cron
 * backfills that only send `{wordCount}` are not reset to 0 by this middleware.
 */
export async function extractWordCount(
    strapi: StrapiInstance,
    data: ArticleDocument | PodcastDocument,
    contentType: 'article' | 'podcast',
): Promise<void> {
    try {
        if (!hasRichtextFieldInPayload(data, contentType)) {
            // Partial update (e.g. cron only sets wordCount) — leave wordCount unchanged
            return;
        }

        // `contentType` is 'article' | 'podcast'; narrow the payload union accordingly
        // (runtime behaviour is unchanged — the field names drive everything below).
        let richtextValue: string | RichTextBlock[] | undefined;
        if (contentType === 'article' && 'content' in data) {
            richtextValue = data.content;
        } else if ('shownotes' in data) {
            richtextValue = data.shownotes;
        }

        const content = extractTextFromRichtext(richtextValue);

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

        const wordCount = countWords(content);

        data.wordCount = wordCount;

        if (wordCount > 0) {
            strapi.log.info(
                `Calculated wordCount: ${wordCount} for ${contentType} (${data.slug || 'new'}), content length: ${content.length}`,
            );
        } else {
            strapi.log.warn(
                `WordCount is 0 for ${contentType} (${data.slug || 'new'}) but extracted content exists (length: ${content.length}), preview: ${content.substring(0, 100)}`,
            );
        }
    } catch (error) {
        // Never block the save; wordCount stays defined either way.
        strapi.log.error(`Error extracting word count for ${contentType}:`, error);
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
    context: DocumentServiceContext,
    next: DocumentServiceNext,
): Promise<unknown> {
    const uid = context.contentType?.uid;
    if (uid !== 'api::article.article' && uid !== 'api::podcast.podcast') {
        return next();
    }

    const contentType = uid === 'api::article.article' ? 'article' : 'podcast';
    const strapiInstance = context.params?.strapi;

    // Strapi's admin "Duplicate" action runs a dedicated `clone` document-service action —
    // it never passes through the `create`/`update` branch below, so a duplicate always
    // inherited whatever wordCount was stored on the source entry verbatim, stale or not.
    // Recompute it here from the source's own content/shownotes and inject it into `data`
    // (the same object the clone implementation merges into every cloned entry) so the
    // copy gets a freshly-computed value, bypassing the partial-update guard in
    // `extractWordCount` since the source always has its richtext field.
    if (context.action === 'clone') {
        if (strapiInstance) {
            try {
                const sourceDocumentId = context.params?.documentId;
                const source = await strapiInstance.documents(uid).findOne({documentId: sourceDocumentId});
                if (source) {
                    const probe: ArticleDocument | PodcastDocument =
                        contentType === 'article'
                            ? {content: source.content as ArticleDocument['content']}
                            : {shownotes: source.shownotes as PodcastDocument['shownotes']};
                    await extractWordCount(strapiInstance, probe, contentType);
                    if (probe.wordCount !== undefined) {
                        if (!context.params) context.params = {};
                        context.params.data = {...context.params.data, wordCount: probe.wordCount};
                    }
                }
            } catch (error) {
                strapiInstance.log.warn(`Failed to recalculate wordCount for ${contentType} clone:`, error);
            }
        }
        return next();
    }

    if (['create', 'update'].includes(context.action)) {
        const data = context.params?.data;
        if (data) {
            if (!strapiInstance) return next();
            // extractWordCount handles its own errors and never rejects, so a
            // failed word count cannot block the save operation.
            await extractWordCount(strapiInstance, data, contentType);
        }
    }

    return next();
}
