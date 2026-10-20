#!/usr/bin/env node
/**
 * CI guardrail: fail when the committed copies of the shared contracts drift
 * from the source of truth in `shared/`.
 *
 * Both workspaces ship committed byte-copies of `shared/` (refreshed by their
 * own `pre*` npm hooks) because the frontend-only Docker build cannot read the
 * repo root. Nothing else verifies that a copy matches the source, so a stale
 * copy ships silently and turns cache invalidation into a no-op: the backend
 * emits invalidation tags the frontend no longer reads, and pages stay stale
 * with no error.
 *
 * Usage: node scripts/check-shared-contracts.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'shared');

// Mirrors the two per-workspace sync scripts: the frontend copies every file,
// the backend only TypeScript sources.
const DESTINATIONS = [
    {
        name: 'frontend',
        dir: path.join(ROOT, 'frontend/src/lib/shared/contracts'),
        include: () => true,
    },
    {
        name: 'backend',
        dir: path.join(ROOT, 'backend/src/shared/contracts'),
        include: (fileName) => fileName.endsWith('.ts'),
    },
];

function listFiles(dir, include) {
    /** @type {string[]} */
    const out = [];
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...listFiles(full, include));
        } else if (include(entry.name)) {
            out.push(full);
        }
    }
    return out;
}

function toRelative(root, filePath) {
    return path.relative(root, filePath).split(path.sep).join('/');
}

function main() {
    if (!fs.existsSync(SOURCE)) {
        console.error('check-shared-contracts: shared/ is missing at the repo root');
        process.exitCode = 1;
        return;
    }

    const differences = [];

    for (const {name, dir, include} of DESTINATIONS) {
        if (!fs.existsSync(dir)) {
            differences.push(`${name}: destination ${toRelative(ROOT, dir)} does not exist`);
            continue;
        }

        const expected = listFiles(SOURCE, include).map((file) => toRelative(SOURCE, file));

        for (const relative of expected) {
            const destPath = path.join(dir, relative);
            if (!fs.existsSync(destPath)) {
                differences.push(`${name}: ${relative} is missing from the copy`);
                continue;
            }
            const source = fs.readFileSync(path.join(SOURCE, relative));
            if (!source.equals(fs.readFileSync(destPath))) {
                differences.push(`${name}: ${relative} differs from shared/${relative}`);
            }
        }

        for (const relative of listFiles(dir, include).map((file) => toRelative(dir, file))) {
            if (!expected.includes(relative)) {
                differences.push(`${name}: ${relative} exists only in the copy`);
            }
        }
    }

    if (differences.length > 0) {
        console.error('check-shared-contracts: the shared/ copies are out of date:\n');
        for (const difference of differences.sort()) {
            console.error(`  ${difference}`);
        }
        console.error(
            '\nRun the affected workspace\'s sync hook, e.g. `pnpm run build` in frontend/ or backend/.',
        );
        process.exit(1);
    }

    const names = DESTINATIONS.map((d) => d.name).join(' + ');
    console.log(`check-shared-contracts: OK (${names} copies match shared/)`);
}

main();
