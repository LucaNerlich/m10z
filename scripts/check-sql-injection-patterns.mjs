#!/usr/bin/env node
/**
 * CI guardrail: fail if code builds SQL from dynamic values inside a raw call.
 *
 * Two forms are detected:
 *   - `${...}` interpolation in a raw template literal, e.g.
 *     `db.connection.raw(\`SELECT ${id}\`)`;
 *   - concatenation into a string-literal first argument, e.g.
 *     `connection.raw('SELECT … ' + id)` and `whereRaw(\`slug = '${slug}'\`)`
 *     when written as ``whereRaw(`… ${slug} …`)``.
 *
 * Safe: parameterized `db.connection.raw('... ? ...', [v])` or templates with only
 * `?` / `??` placeholders, no `${`.
 *
 * Heuristic ceiling: this matches known raw-call shapes only. SQL assembled by
 * other means (a helper that concatenates internally, a non-raw query builder
 * path) is not detected — the check narrows the surface, it does not prove
 * absence.
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

/**
 * Flag `raw('SQL … ' + value)`: a raw call whose first argument is a string
 * literal concatenated with something else.
 *
 * Heuristic ceiling: only the string-literal-first form is detected. A raw call
 * whose first argument is an expression that concatenates SQL internally (e.g.
 * `raw(buildSql() + tail)`) is not, nor is SQL assembled without a raw call.
 *
 * @param {string} filePath
 * @param {string} text
 * @param {RegExp} openRe - must end immediately after the opening `(`, with trailing whitespace allowed
 */
function findConcatenatedRawCalls(filePath, text, openRe) {
    const issues = [];
    openRe.lastIndex = 0;
    let m;
    while ((m = openRe.exec(text)) !== null) {
        let i = m.index + m[0].length;
        const quote = text[i];
        if (quote !== "'" && quote !== '"') continue;

        i += 1;
        while (i < text.length) {
            const c = text[i];
            if (c === '\\') {
                i += 2;
                continue;
            }
            if (c === quote) break;
            i += 1;
        }
        if (i >= text.length) continue;
        i += 1; // step past the closing quote

        let j = i;
        while (j < text.length && /\s/.test(text[j])) j++;
        if (text[j] !== '+') continue;

        const line = text.slice(0, m.index).split('\n').length;
        issues.push({
            file: path.relative(ROOT, filePath),
            line,
            pattern: openRe.source.slice(0, 40),
            preview: text.slice(m.index, m.index + 120).replace(/\s+/g, ' '),
        });
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

// Raw-template openers: a raw call immediately followed by a template literal.
const OPENERS = [
    {re: /(?:strapi\.db\.)?connection\.raw\(\s*`/g, label: 'connection.raw(`...`)'},
    {re: /\$queryRaw`/g, label: '$queryRaw`...`'},
    {re: /\$executeRaw`/g, label: '$executeRaw`...`'},
    {re: /\.query\(\s*`/g, label: '.query(`...`)'},
    {re: /\.(?:where|select|having|orderBy|groupBy|join)Raw\(\s*`/g, label: '.*Raw(`...`)'},
];

// Raw calls whose first argument is a string literal — the concatenation form:
//   connection.raw('SELECT … WHERE name = ' + userInput)
const CONCAT_OPENERS = [
    {re: /(?:strapi\.db\.)?connection\.raw\(\s*/g, label: 'connection.raw(...)'},
    {re: /\$queryRaw\(\s*/g, label: '$queryRaw(...)'},
    {re: /\$executeRaw\(\s*/g, label: '$executeRaw(...)'},
    {re: /\.query\(\s*/g, label: '.query(...)'},
    {re: /\.(?:where|select|having|orderBy|groupBy|join)Raw\(\s*/g, label: '.*Raw(...)'},
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
            for (const {re, label} of CONCAT_OPENERS) {
                const found = findConcatenatedRawCalls(filePath, text, re);
                for (const f of found) {
                    allIssues.push({...f, label});
                }
            }
        }
    }

    if (allIssues.length > 0) {
        console.error(
            'check-sql-injection-patterns: disallowed string building inside SQL-like raw calls:\n',
        );
        for (const i of allIssues) {
            console.error(`  ${i.file}:${i.line} [${i.label}]\n    ${i.preview}`);
        }
        process.exit(1);
    }

    console.log('check-sql-injection-patterns: OK (no dynamic SQL built in raw calls found)');
}

main();
