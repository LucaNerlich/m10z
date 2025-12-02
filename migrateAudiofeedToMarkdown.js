const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const yamlFilePath = './static/audiofeed.yaml';
const episodesDir = './static/audiofeed/episodes';

/**
 * Extract slug from blogpost URL
 * @param {string} blogpostUrl - The blogpost URL (e.g., "https://m10z.de/pixelplausch-9")
 * @returns {string} The slug (e.g., "pixelplausch-9")
 */
function extractSlugFromBlogpost(blogpostUrl) {
    if (!blogpostUrl) return null;
    try {
        const url = new URL(blogpostUrl);
        const slug = url.pathname.replace(/^\//, '').replace(/\/$/, '');
        return slug || null;
    } catch (e) {
        return null;
    }
}

/**
 * Generate slug from title if blogpost URL is not available
 * @param {string} title - The episode title
 * @returns {string} A sanitized slug
 */
function generateSlugFromTitle(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate filename from episode data
 * @param {object} episode - Episode object from YAML
 * @returns {string} Filename in format YYYY-MM-DDTHH-MM-{slug}.md
 */
function generateFilename(episode) {
    const date = episode.date;
    // Replace : with - in time for filesystem compatibility
    const dateForFilename = date.replace(':', '-');

    // Extract slug from blogpost URL, fallback to title-based slug
    let slug = extractSlugFromBlogpost(episode.blogpost);
    if (!slug) {
        slug = generateSlugFromTitle(episode.title);
    }

    return `${dateForFilename}-${slug}.md`;
}

/**
 * Convert YAML episode to markdown file content
 * @param {object} episode - Episode object from YAML
 * @returns {string} Markdown file content
 */
function convertEpisodeToMarkdown(episode) {
    // Build frontmatter
    const frontmatter = {
        title: episode.title,
        date: episode.date,
        image: episode.image,
        seconds: episode.seconds,
        blogpost: episode.blogpost,
        url: episode.url,
    };

    // Convert frontmatter to YAML string (simple key-value pairs)
    const frontmatterLines = Object.entries(frontmatter)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
            // Quote values that contain special characters or are strings
            if (typeof value === 'string' && (value.includes(':') || value.includes(' ') || value.includes('\''))) {
                return `${key}: '${value.replace(/'/g, '\'\'')}'`;
            }
            return `${key}: ${value}`;
        });

    const frontmatterStr = frontmatterLines.join('\n');

    // Description goes in the body (trimmed to remove YAML literal block indentation)
    let description = episode.description || '';

    // Remove common leading whitespace from all lines (YAML literal block indentation)
    if (description) {
        const lines = description.split('\n');
        // Find minimum indentation (excluding empty lines)
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        if (nonEmptyLines.length > 0) {
            const minIndent = Math.min(...nonEmptyLines.map(line => {
                const match = line.match(/^(\s*)/);
                return match ? match[1].length : 0;
            }));
            // Remove the common indentation
            description = lines.map(line => {
                if (line.trim().length === 0) return '';
                return line.substring(minIndent);
            }).join('\n');
        }
        description = description.trim();
    }

    return `---\n${frontmatterStr}\n---\n\n${description}\n`;
}

// Main migration function
function migrate() {
    console.log('Starting migration from YAML to Markdown files...');

    // Ensure episodes directory exists
    if (!fs.existsSync(episodesDir)) {
        fs.mkdirSync(episodesDir, {recursive: true});
        console.log(`Created directory: ${episodesDir}`);
    }

    // Read YAML file
    console.log(`Reading ${yamlFilePath}...`);
    const yamlData = fs.readFileSync(yamlFilePath, 'utf8');
    const episodes = yaml.load(yamlData);

    if (!Array.isArray(episodes)) {
        console.error('Error: YAML file does not contain an array of episodes');
        process.exit(1);
    }

    console.log(`Found ${episodes.length} episodes to migrate`);

    // Convert each episode
    let successCount = 0;
    let errorCount = 0;

    episodes.forEach((episode, index) => {
        try {
            const filename = generateFilename(episode);
            const filepath = path.join(episodesDir, filename);
            const markdownContent = convertEpisodeToMarkdown(episode);

            fs.writeFileSync(filepath, markdownContent, 'utf8');
            console.log(`[${index + 1}/${episodes.length}] Created: ${filename}`);
            successCount++;
        } catch (error) {
            console.error(`[${index + 1}/${episodes.length}] Error processing episode "${episode.title}":`, error.message);
            errorCount++;
        }
    });

    console.log('\nMigration complete!');
    console.log(`Successfully migrated: ${successCount} episodes`);
    if (errorCount > 0) {
        console.log(`Errors: ${errorCount} episodes`);
    }
}

// Run migration
migrate();

