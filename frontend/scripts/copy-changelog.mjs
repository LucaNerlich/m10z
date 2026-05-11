import {copyFileSync, existsSync, mkdirSync} from 'node:fs';
import path from 'node:path';

// import.meta.dirname is always this script's directory — never affected by CWD
const projectRoot = path.join(import.meta.dirname, '..');
const src = path.join(projectRoot, 'CHANGELOG.md');
const destDir = path.join(projectRoot, 'public');
const dest = path.join(destDir, 'changelog.md');

if (!existsSync(src)) {
    console.warn('[copy-changelog] CHANGELOG.md not found at', src);
    process.exit(0);
}

mkdirSync(destDir, {recursive: true});
copyFileSync(src, dest);
console.log('[copy-changelog] copied CHANGELOG.md to public/changelog.md');
