/**
 * Convert markdown text to HTML for RSS feed descriptions.
 * Supports: lists, links, bold, italic, and line breaks.
 */

/**
 * Process inline markdown formatting (bold, italic, links)
 * @param {string} text - Text to process
 * @return {string} Processed HTML text
 */
function processInlineMarkdown(text) {
    if (!text) return '';
    
    let processed = text;
    
    // Convert markdown links FIRST, before processing underscores/asterisks
    // This prevents URLs from being processed as italic/bold
    const linkPlaceholders = [];
    let placeholderIndex = 0;
    
    // Protect markdown links by replacing entire link with placeholder
    // Use placeholder format without underscores to avoid conflicts
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
        const placeholder = `LINKPLACEHOLDER${placeholderIndex}LINKPLACEHOLDER`;
        linkPlaceholders.push({placeholder, linkText, url});
        placeholderIndex++;
        return placeholder;
    });
    
    // Convert markdown bold (**text** or __text__) to <strong>
    // Process bold before italic to avoid conflicts
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Convert markdown italic (*text* or _text_) to <em>
    // Match single asterisks/underscores that aren't part of bold
    processed = processed.replace(/([^*]|^)\*([^*]+?)\*([^*]|$)/g, '$1<em>$2</em>$3');
    // For underscores, be careful not to process URLs
    // URLs typically have underscores in query parameters like ?locale=de_DE
    processed = processed.replace(/([^_]|^)_([^_]+?)_([^_]|$)/g, (match, before, content, after) => {
        // Check if this looks like it's part of a URL (has :// or starts with http, or is in query params)
        const context = (before || '') + '_' + content + '_' + (after || '');
        // Don't convert if it's part of a URL pattern
        if (/https?:\/\//i.test(context) || /[?&][^=]*=[^_]*_[^_]*/i.test(context) || /^https?:\/\//i.test(context.trim())) {
            return match; // Don't convert - it's part of a URL
        }
        return before + '<em>' + content + '</em>' + after;
    });
    
    // Restore markdown links and convert to HTML links
    // Process link text separately - if it's a URL, don't process markdown formatting
    for (const linkInfo of linkPlaceholders) {
        let linkText = linkInfo.linkText;
        // Check if link text looks like a URL - if so, don't process markdown formatting at all
        const isUrl = /^https?:\/\//i.test(linkText.trim());
        if (!isUrl) {
            // Process markdown formatting in link text (but URLs are already protected)
            linkText = linkText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            linkText = linkText.replace(/__([^_]+)__/g, '<strong>$1</strong>');
            linkText = linkText.replace(/([^*]|^)\*([^*]+?)\*([^*]|$)/g, '$1<em>$2</em>$3');
            // For underscores, be more careful - don't process if they're part of a URL pattern
            // URLs typically have underscores in query parameters like ?locale=de_DE
            linkText = linkText.replace(/([^_]|^)_([^_]+?)_([^_]|$)/g, (match, before, content, after) => {
                // Check if this looks like it's part of a URL (has :// or starts with http)
                const context = before + '_' + content + '_' + after;
                if (/https?:\/\/[^_]*_[^_]*/i.test(context) || /[?&][^=]*=[^_]*_[^_]*/i.test(context)) {
                    return match; // Don't convert - it's part of a URL
                }
                return before + '<em>' + content + '</em>' + after;
            });
        }
        // Replace placeholder with HTML link
        // Use the original linkText (which hasn't been processed if it's a URL)
        // and the original URL (which also hasn't been processed)
        // IMPORTANT: Use linkText as-is if it's a URL to preserve underscores
        const finalLinkText = isUrl ? linkInfo.linkText : linkText;
        processed = processed.replace(linkInfo.placeholder, `<a href="${linkInfo.url}">${finalLinkText}</a>`);
    }
    
    return processed;
}

/**
 * Process markdown formatting in text (excluding HTML tags)
 * @param {string} text - Text to process
 * @return {string} Processed HTML text
 */
function processMarkdownText(text) {
    if (!text) return '';
    
    let processed = text;
    const lines = processed.split('\n');
    const result = [];
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i];
        
        // Check if this line starts an unordered list
        if (/^[-*+]\s+/.test(line)) {
            const listItems = [];
            let foundListItem = false;
            // Collect consecutive list items (including blank lines between them)
            // Stop when we hit a non-blank line that's not a list item
            while (i < lines.length) {
                if (lines[i].trim() === '') {
                    // Blank line - continue collecting
                    i++;
                } else if (/^[-*+]\s+/.test(lines[i])) {
                    // List item - collect it
                    const content = lines[i].replace(/^[-*+]\s+/, '').trim();
                    // Process inline markdown (this will protect URLs)
                    const processedContent = processInlineMarkdown(content);
                    listItems.push(`<li>${processedContent}</li>`);
                    foundListItem = true;
                    i++;
                } else {
                    // Non-list line - stop collecting
                    break;
                }
            }
            // Only create list if we found at least one item
            if (foundListItem) {
                result.push(`<ul>${listItems.join('')}</ul>`);
                continue;
            }
        }
        
        // Check if this line starts an ordered list
        if (/^\d+\.\s+/.test(line)) {
            const listItems = [];
            let foundListItem = false;
            // Collect consecutive list items (including blank lines between them)
            while (i < lines.length) {
                if (lines[i].trim() === '') {
                    // Blank line - continue collecting
                    i++;
                } else if (/^\d+\.\s+/.test(lines[i])) {
                    // List item - collect it
                    const content = lines[i].replace(/^\d+\.\s+/, '').trim();
                    // Process inline markdown (this will protect URLs)
                    const processedContent = processInlineMarkdown(content);
                    listItems.push(`<li>${processedContent}</li>`);
                    foundListItem = true;
                    i++;
                } else {
                    // Non-list line - stop collecting
                    break;
                }
            }
            // Only create list if we found at least one item
            if (foundListItem) {
                result.push(`<ol>${listItems.join('')}</ol>`);
                continue;
            }
        }
        
        // Regular line - add as-is
        result.push(line);
        i++;
    }
    
    processed = result.join('\n');
    
    // Convert double line breaks (paragraph breaks) to <br/><br/>
    processed = processed.replace(/\n\n+/g, '<br/><br/>');
    
    // Convert single line breaks to <br/>
    processed = processed.replace(/\n/g, '<br/>');
    
    // Process inline markdown (bold, italic, links) for remaining text
    processed = processInlineMarkdown(processed);
    
    return processed;
}

/**
 * Convert markdown text to HTML for RSS feed description.
 * Preserves line breaks and converts markdown formatting to HTML.
 * 
 * @param {string} markdownText - The markdown text to convert
 * @return {string} HTML formatted text
 */
function markdownToHtml(markdownText) {
    if (!markdownText) return '';
    
    let html = markdownText.trim();
    
    // Split by HTML tags to process markdown separately from HTML
    // Use a regex that properly handles HTML tags and their attributes
    // This protects URLs in href attributes from being processed
    const parts = html.split(/(<[^>]+>)/);
    let result = '';
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        // If it's an HTML tag, add it as-is (this protects URLs in href attributes)
        if (part.startsWith('<') && part.endsWith('>')) {
            result += part;
        } else {
            // Process markdown in text parts
            // But skip if this text is between HTML tags (like link text)
            // Check if previous and next parts are HTML tags
            const prevIsTag = i > 0 && parts[i - 1].startsWith('<') && parts[i - 1].endsWith('>');
            const nextIsTag = i < parts.length - 1 && parts[i + 1].startsWith('<') && parts[i + 1].endsWith('>');
            
            // If text is between HTML tags (like <a>text</a>), check if it's a URL
            // If it's a URL, don't process it (preserve underscores)
            if (prevIsTag && nextIsTag && parts[i - 1].startsWith('<a')) {
                // Check if the link text is a URL - if so, don't process it
                const isUrl = /^https?:\/\//i.test(part.trim());
                if (isUrl) {
                    result += part; // URL link text - already processed, use as-is
                } else {
                    // Non-URL link text - might need processing, but be careful
                    result += processMarkdownText(part);
                }
            } else {
                result += processMarkdownText(part);
            }
        }
    }
    
    return result;
}

module.exports = {
    markdownToHtml,
    processMarkdownText,
    processInlineMarkdown
};

