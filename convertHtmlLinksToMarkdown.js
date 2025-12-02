const fs = require('fs');
const path = require('path');

const episodesDir = './static/audiofeed/episodes';

/**
 * Convert HTML links to markdown format
 * @param {string} content - File content
 * @returns {string} Content with markdown links
 */
function convertHtmlLinksToMarkdown(content) {
    // Match HTML anchor tags: <a href="url">text</a>
    // This regex handles:
    // - href attribute with quotes (single or double)
    // - Link text that may contain HTML entities or special characters
    // - Self-closing tags or tags with attributes
    const htmlLinkRegex = /<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    
    return content.replace(htmlLinkRegex, (match, url, text) => {
        // Trim whitespace from link text
        const linkText = text.trim();
        // Convert to markdown format: [text](url)
        return `[${linkText}](${url})`;
    });
}

/**
 * Process all episode markdown files
 */
function convertAllEpisodes() {
    if (!fs.existsSync(episodesDir)) {
        console.error(`Error: Episodes directory not found: ${episodesDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(episodesDir)
        .filter(file => file.endsWith('.md'));

    console.log(`Found ${files.length} episode files to process`);

    let convertedCount = 0;
    let totalLinksConverted = 0;

    files.forEach((file, index) => {
        const filePath = path.join(episodesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if file contains HTML links
        const htmlLinkRegex = /<a\s+href=["'][^"']+["'][^>]*>[^<]+<\/a>/gi;
        const matches = content.match(htmlLinkRegex);
        
        if (matches && matches.length > 0) {
            const convertedContent = convertHtmlLinksToMarkdown(content);
            fs.writeFileSync(filePath, convertedContent, 'utf8');
            console.log(`[${index + 1}/${files.length}] ${file}: Converted ${matches.length} HTML link(s)`);
            convertedCount++;
            totalLinksConverted += matches.length;
        }
    });

    console.log('\nConversion complete!');
    console.log(`Files modified: ${convertedCount}`);
    console.log(`Total links converted: ${totalLinksConverted}`);
}

// Run conversion
convertAllEpisodes();

