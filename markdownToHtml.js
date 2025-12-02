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
    
    // Convert markdown bold (**text** or __text__) to <strong>
    // Process bold before italic to avoid conflicts
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Convert markdown italic (*text* or _text_) to <em>
    // Match single asterisks/underscores that aren't part of bold
    processed = processed.replace(/([^*]|^)\*([^*]+?)\*([^*]|$)/g, '$1<em>$2</em>$3');
    processed = processed.replace(/([^_]|^)_([^_]+?)_([^_]|$)/g, '$1<em>$2</em>$3');
    
    // Convert markdown links [text](url) to HTML links
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
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
                    listItems.push(`<li>${processInlineMarkdown(content)}</li>`);
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
                    listItems.push(`<li>${processInlineMarkdown(content)}</li>`);
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
    const parts = html.split(/(<[^>]+>)/);
    let result = '';
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        // If it's an HTML tag, add it as-is
        if (part.startsWith('<') && part.endsWith('>')) {
            result += part;
        } else {
            // Process markdown in text parts
            result += processMarkdownText(part);
        }
    }
    
    return result;
}

module.exports = {
    markdownToHtml,
    processMarkdownText,
    processInlineMarkdown
};

