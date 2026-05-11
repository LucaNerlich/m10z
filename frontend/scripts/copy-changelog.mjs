import {copyFileSync, existsSync, mkdirSync} from 'node:fs';
import path from 'node:path';

// import.meta.dirname is always this script's directory — never affected by CWD
const projectRoot = path.join(import.meta.dirname, '..');
const src = path.join(projectRoot, 'CHANGELOG.md');
const destDir = path.join(projectRoot, 'public');
const dest = path.join(destDir, 'changelog.md');

if (!existsSync(src)) {
    console.error(
        `[copy-changelog] CHANGELOG.md not found at ${src}. ` +
            'Ensure it is present in the build context (e.g. not excluded by .dockerignore).'
    );
    process.exit(1);
}

mkdirSync(destDir, {recursive: true});
copyFileSync(src, dest);
console.log('[copy-changelog] copied CHANGELOG.md to public/changelog.md');
