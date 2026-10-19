#!/usr/bin/env node
/**
 * CI guardrail: fail if code builds SQL from dynamic values inside a raw call.
 *
 * Two forms are detected:
 *   - `${...}` interpolation in a raw template literal, e.g.
 *     `db.connection.raw(\`SELECT ${id}\`)`;
 *   - concatenation into a literal first argument, e.g.
 *     `connection.raw('SELECT … ' + id)`, `` connection.raw(`SELECT … ` + id) ``
 *     and `whereRaw(\`slug = '${slug}'\`)` when written as
 *     ``whereRaw(`… ${slug} …`)``.
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
import {fileURLToPath, pathToFileURL} from 'url';

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
 * Flag a raw call whose first argument is a literal concatenated with something
 * else: `raw('SQL … ' + value)` and ``raw(`SQL … ` + value)``.
 *
 * Heuristic ceiling: only the literal-first form is detected. A raw call whose
 * first argument is an expression that concatenates SQL internally (e.g.
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
        const opener = text[i];

        if (opener === '`') {
            // Template-literal first argument. The interpolation pass only fires
            // on `${` *inside* the body, so ``raw(`… ` + value)`` is only caught
            // here; reuse the template reader and keep the `+` check below.
            const read = readTemplateLiteralBody(text, i);
            if (!read) continue;
            i = read.end;
        } else if (opener === "'" || opener === '"') {
            const quote = opener;
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
        } else {
            continue;
        }

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

/**
 * Run both detectors over a chunk of source text.
 *
 * @param {string} text
 * @param {string} [filePath] - used only to label the issue (defaults to `inline`)
 * @returns {Array<{file: string, line: number, pattern: string, preview: string, label: string}>}
 */
function findSqlInjectionIssues(text, filePath = 'inline') {
    const issues = [];
    for (const {re, label} of OPENERS) {
        for (const f of findInterpolatedSqlTemplates(filePath, text, re)) {
            issues.push({...f, label});
        }
    }
    for (const {re, label} of CONCAT_OPENERS) {
        for (const f of findConcatenatedRawCalls(filePath, text, re)) {
            issues.push({...f, label});
        }
    }
    return issues;
}

function main() {
    const targets = [path.join(ROOT, 'frontend'), path.join(ROOT, 'backend')].filter((p) =>
        fs.existsSync(p),
    );

    const allIssues = [];

    for (const base of targets) {
        for (const filePath of walk(base)) {
            const text = fs.readFileSync(filePath, 'utf8');
            allIssues.push(...findSqlInjectionIssues(text, filePath));
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

export {findConcatenatedRawCalls, findInterpolatedSqlTemplates, findSqlInjectionIssues, readTemplateLiteralBody};

// Run only when invoked as a script (`node scripts/check-sql-injection-patterns.mjs`);
// importing it from a test must not scan the repo or call process.exit.
function isDirectRun() {
    const entry = process.argv[1];
    if (!entry) return false;
    try {
        return pathToFileURL(path.resolve(entry)).href === import.meta.url;
    } catch {
        return false;
    }
}

if (isDirectRun()) {
    main();
}
