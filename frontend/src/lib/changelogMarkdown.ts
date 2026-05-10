import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

export async function getChangelogMarkdown(): Promise<string> {
    const candidates = [
        path.join(process.cwd(), 'CHANGELOG.md'),
        path.join(process.cwd(), 'frontend', 'CHANGELOG.md'),
    ];
    for (const filePath of candidates) {
        if (existsSync(filePath)) {
            return readFile(filePath, 'utf-8');
        }
    }
    throw new Error('CHANGELOG.md was not found');
}
