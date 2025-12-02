const fs = require('fs');
const matter = require('gray-matter');
const xml2js = require('xml2js');
const crypto = require('crypto');
const https = require('https');
const {URL} = require('url');
const path = require('path');

const basepath = './static/audiofeed';
const episodesDir = path.join(__dirname, 'static/audiofeed/episodes');
const cacheFile = path.join(__dirname, 'file-size-cache.json');

// Convert dateString to IETF RFC 2822
function convertToPubDateFormat(dateString) {
    const date = new Date(dateString);
    return date.toUTCString();
}

function toHash(string) {
    const hash = crypto.createHash('sha256');
    hash.update(string);
    return hash.digest('hex');
}

/**
 * Returns a sum of seconds for the given input time string.
 * Valid input values:
 * - 10:00:00 -> hours:minutes:seconds
 * - 10:00 -> minutes:seconds
 * - 13000 -> just seconds
 *
 * @param {string} time The input time string in one of the valid formats.
 * @return {number} The total number of seconds.
 */
function getSeconds(time) {
    const timeParts = time.toString().split(':');
    let seconds = 0;
    if (timeParts.length === 3) {
        seconds += parseInt(timeParts[0]) * 3600; // hours to seconds
        seconds += parseInt(timeParts[1]) * 60; // minutes to seconds
        seconds += parseInt(timeParts[2]); // seconds
    } else if (timeParts.length === 2) {
        seconds += parseInt(timeParts[0]) * 60; // minutes to seconds
        seconds += parseInt(timeParts[1]); // seconds
    } else {
        seconds += parseInt(timeParts[0]); // seconds
    }
    return seconds;
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

/**
 * Process markdown formatting in text (excluding HTML tags)
 * @param {string} text - Text to process
 * @return {string} Processed HTML text
 */
function processMarkdownText(text) {
    if (!text) return '';
    
    let processed = text;
    
    // Convert double line breaks (paragraph breaks) to <br/><br/>
    processed = processed.replace(/\n\n+/g, '<br/><br/>');
    
    // Convert single line breaks to <br/>
    processed = processed.replace(/\n/g, '<br/>');
    
    // Convert markdown bold (**text** or __text__) to <strong>
    // Process bold before italic to avoid conflicts
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Convert markdown italic (*text* or _text_) to <em>
    // Match single asterisks/underscores that aren't part of bold
    // Use a simple approach: match *text* or _text_ but not **text** or __text__
    processed = processed.replace(/([^*]|^)\*([^*]+?)\*([^*]|$)/g, '$1<em>$2</em>$3');
    processed = processed.replace(/([^_]|^)_([^_]+?)_([^_]|$)/g, '$1<em>$2</em>$3');
    
    // Convert markdown links [text](url) to HTML links
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    return processed;
}

function readCache() {
    if (fs.existsSync(cacheFile)) {
        const cacheContent = fs.readFileSync(cacheFile, 'utf8');
        return JSON.parse(cacheContent);
    }
    return {};
}

function writeCache(cacheData) {
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
}

function generateHash(options) {
    return `${options.host}-${options.path}`;
}

async function getCachedFileSize(options, cache) {
    const oneDay = 24 * 60 * 60 * 1000; // 1 day
    const cacheDuration = oneDay * 30;  // 30 days
    const hash = generateHash(options);

    if (cache[hash] && (Date.now() - cache[hash].timestamp < cacheDuration)) {
        console.log(`Cache hit for ${hash}`);
        return cache[hash].size;
    }

    const fileSize = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            console.log('status', `${res.statusCode} ${options.host}${options.path}`);
            const size = res.headers['content-length'];
            if (size) {
                cache[hash] = {size, timestamp: Date.now()};
                resolve(size);
            } else {
                reject(new Error('Failed to get content-length header'));
            }
        });

        req.on('error', reject);
        req.end();
    });

    writeCache(cache);
    return fileSize;
}

async function episodeToXml(episode, cache) {
    const url = new URL(episode.url);
    const options = {
        method: 'HEAD',
        host: url.hostname,
        path: url.pathname,
    };

    const fileSize = await getCachedFileSize(options, cache);
    console.log(`Processed file size for ${episode.url}: ${fileSize}`);

    // Convert markdown description to HTML for RSS feed
    const description = episode.description ? markdownToHtml(episode.description) : '';

    return {
        'title': episode.title,
        'pubDate': convertToPubDateFormat(episode.date),
        'lastBuildDate': convertToPubDateFormat(episode.date),
        'guid': {
            _: toHash(episode.url),
            $: {isPermaLink: 'false'},
        },
        'itunes:image': {
            $: {
                href: episode.image ?? 'https://raw.githubusercontent.com/LucaNerlich/m10z/main/static/img/formate/cover/m10z.jpg',
            },
        },
        'description': description,
        'author': 'm10z@posteo.de',
        'itunes:explicit': 'false',
        'link': episode.blogpost ?? 'https://m10z.de',
        'itunes:duration': getSeconds(episode.seconds),
        'enclosure': {
            $: {
                url: episode.url,
                length: fileSize,
                type: 'audio/mpeg',
            },
        },
    };
}

/**
 * Read all markdown episode files and parse them
 * @returns {Array} Array of episode objects
 */
function readEpisodes() {
    if (!fs.existsSync(episodesDir)) {
        console.error(`Error: Episodes directory not found: ${episodesDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(episodesDir)
        .filter(file => file.endsWith('.md'))
        .sort()
        .reverse(); // Newest first (by filename date)

    return files.map(file => {
        const filePath = path.join(episodesDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed = matter(fileContent);

        return {
            ...parsed.data,
            description: parsed.content.trim(), // Description is in the markdown body
        };
    });
}

async function generateFeedXML(episodes) {
    const cache = readCache();

    const data = fs.readFileSync('./templates/rss-channel.xml');

    xml2js.parseString(data, async (err, result) => {
        if (err) {
            console.error(err);
            return;
        }

        result.rss.channel[0]['pubDate'] = convertToPubDateFormat(new Date().toDateString());
        result.rss.channel[0].item = await Promise.all(episodes.map(async (episode, index) => {
            console.log(`Processing item ${index + 1}/${episodes.length}`);
            const item = await episodeToXml(episode, cache);
            console.log(`Successfully processed item ${index + 1}/${episodes.length}`);
            return item;
        }));

        const builder = new xml2js.Builder({renderOpts: {'pretty': true, 'indent': '    ', 'newline': '\n'}, cdata: true});
        const xml = builder.buildObject(result);

        fs.writeFileSync(basepath + '.xml', xml);
        console.log('RSS feed XML file successfully written.');

        // Terminate process when done
        process.exit(0);
    });
}

console.log('Creating audiofeed.xml');
const episodes = readEpisodes();
console.log(`Found ${episodes.length} episodes`);
generateFeedXML(episodes)
    .then(() => console.log('Successfully created audiofeed.xml'))
    .catch(error => {
        console.error('Failed to generate audiofeed.xml', error);
        process.exit(1);
    });
