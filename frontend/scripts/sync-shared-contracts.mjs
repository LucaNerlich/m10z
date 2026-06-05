import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoShared = path.resolve(scriptDir, '../../shared');
const destRoot = path.resolve(scriptDir, '../src/lib/shared/contracts');

function copyRecursive(src, dest) {
    fs.mkdirSync(dest, {recursive: true});
    for (const entry of fs.readdirSync(src, {withFileTypes: true})) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

if (!fs.existsSync(repoShared)) {
    console.error('[sync-shared-contracts] missing shared/ at repo root');
    process.exit(1);
}

fs.rmSync(destRoot, {recursive: true, force: true});
copyRecursive(repoShared, destRoot);
console.log('[sync-shared-contracts] synced shared/ → src/lib/shared/contracts/');
