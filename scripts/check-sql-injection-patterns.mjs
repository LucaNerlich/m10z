#!/usr/bin/env node
/**
 * CI guardrail: fail if code interpolates JavaScript expressions into SQL-style
 * raw template literals (e.g. knex `db.connection.raw(\`SELECT ${id}\`)`).
 *
 * Safe: parameterized `db.connection.raw('... ? ...', [v])` or templates with only `?` / `??` placeholders, no `${`.
 *
 * Usage: node scripts/check-sql-injection-patterns.mjs
 */

import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SKIP_DIRS = new Set([
    'node_modules',
    '.git',
    'dist',
    '.next',
    'build',
    '.strapi',
    'coverage',
    'legacy',
]);

const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

/**
 * @param {string} text
 * @param {number} openBacktickIndex - index of the opening ` of the template literal
 * @returns {{body: string, end: number} | null}
 */
function readTemplateLiteralBody(text, openBacktickIndex) {
    if (text[openBacktickIndex] !== '`') return null;
    let i = openBacktickIndex + 1;
    let body = '';
    while (i < text.length) {
        const c = text[i];
        if (c === '\\') {
            body += text.slice(i, Math.min(i + 2, text.length));
            i += 2;
            continue;
        }
        if (c === '`') {
            return {body, end: i + 1};
        }
        body += c;
        i++;
    }
    return null;
}

/**
 * @param {string} filePath
 * @param {string} text
 * @param {RegExp} openRe - must end so the next char after match is position of `
 */
function findInterpolatedSqlTemplates(filePath, text, openRe) {
    const issues = [];
    openRe.lastIndex = 0;
    let m;
    while ((m = openRe.exec(text)) !== null) {
        const openTick = m.index + m[0].length - 1;
        if (text[openTick] !== '`') continue;
        const read = readTemplateLiteralBody(text, openTick);
        if (!read) continue;
        if (read.body.includes('${')) {
            const line = text.slice(0, openTick).split('\n').length;
            issues.push({
                file: path.relative(ROOT, filePath),
                line,
                pattern: openRe.source.slice(0, 40),
                preview: read.body.replace(/\s+/g, ' ').slice(0, 100),
            });
        }
    }
    return issues;
}

function walk(dir) {
    /** @type {string[]} */
    const out = [];
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
        if (SKIP_DIRS.has(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            out.push(...walk(p));
        } else if (EXT.has(path.extname(e.name))) {
            out.push(p);
        }
    }
    return out;
}

const OPENERS = [
    {re: /(?:strapi\.db\.)?connection\.raw\(\s*`/g, label: 'connection.raw(`...`)'},
    {re: /\$queryRaw`/g, label: '$queryRaw`...`'},
    {re: /\$executeRaw`/g, label: '$executeRaw`...`'},
    {re: /\.query\(\s*`/g, label: '.query(`...`)'},
];

function main() {
    const targets = [path.join(ROOT, 'frontend'), path.join(ROOT, 'backend')].filter((p) =>
        fs.existsSync(p),
    );

    const allIssues = [];

    for (const base of targets) {
        for (const filePath of walk(base)) {
            const text = fs.readFileSync(filePath, 'utf8');
            for (const {re, label} of OPENERS) {
                const found = findInterpolatedSqlTemplates(filePath, text, re);
                for (const f of found) {
                    allIssues.push({...f, label});
                }
            }
        }
    }

    if (allIssues.length > 0) {
        console.error(
            'check-sql-injection-patterns: disallowed `${...}` inside SQL-like template literals:\n',
        );
        for (const i of allIssues) {
            console.error(`  ${i.file}:${i.line} [${i.label}]\n    ${i.preview}`);
        }
        process.exit(1);
    }

    console.log('check-sql-injection-patterns: OK (no interpolated SQL templates found)');
}

main();
