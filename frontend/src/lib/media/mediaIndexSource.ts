import {promises as fs} from 'node:fs';
import path from 'node:path';
import {cache} from 'react';

import {type MediaIndexFile, parseMediaIndex} from './mediaIndex';

const MEDIA_INDEX_PATH = path.join('public', 'media-index.json');

// The index is a deploy artifact that only changes between builds, so a
// process-wide cache keyed by mtime avoids re-reading and re-parsing it on
// every render (React `cache` only dedupes within a single render pass).
let cached: {index: MediaIndexFile; mtimeMs: number} | null = null;

/**
 * Read the committed media index. Returns `null` when the file is missing or
 * invalid so callers can render the authored Markdown unchanged instead of
 * failing — mirroring `getStatistikDashboard`.
 */
export const getMediaIndex = cache(async (): Promise<MediaIndexFile | null> => {
    const filePath = path.join(process.cwd(), MEDIA_INDEX_PATH);
    try {
        const stat = await fs.stat(filePath);
        if (cached && cached.mtimeMs === stat.mtimeMs) return cached.index;
        const index = parseMediaIndex(await fs.readFile(filePath, 'utf8'));
        cached = {index, mtimeMs: stat.mtimeMs};
        return index;
    } catch (error) {
        const code = (error as NodeJS.ErrnoException | null)?.code;
        if (code !== 'ENOENT') {
            console.error(
                '[media-index] Failed to load media index:',
                error instanceof Error ? error.message : error
            );
        }
        cached = null;
        return null;
    }
});
