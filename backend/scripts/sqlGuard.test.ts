import {describe, expect, test} from 'vitest';

// The guard is a plain ESM script at the repo root (run directly by
// `.github/workflows/security-sql-patterns.yml`); it exports its detector and
// only runs the repo scan when invoked as a script.
import {findSqlInjectionIssues} from '../../scripts/check-sql-injection-patterns.mjs';

// The sample sources are assembled from char codes so this test file does not
// itself contain a raw-call concatenation and trip the guard it tests.
const TICK = String.fromCharCode(96); // `
const QUOTE = String.fromCharCode(39); // '
const DOLLAR = String.fromCharCode(36); // $

describe('check-sql-injection-patterns', () => {
    test('flags a template literal concatenated into a raw call', () => {
        const source = `strapi.db.connection.raw(${TICK}SELECT * FROM t WHERE slug = ${TICK} + slug)`;

        expect(findSqlInjectionIssues(source)).toHaveLength(1);
    });

    test('still flags a quoted string concatenated into a raw call', () => {
        const source = `connection.raw(${QUOTE}SELECT * FROM t WHERE slug = ${QUOTE} + slug)`;

        expect(findSqlInjectionIssues(source)).toHaveLength(1);
    });

    test('still flags interpolation inside a raw template', () => {
        const source = `db.connection.raw(${TICK}SELECT * FROM t WHERE slug = ${DOLLAR}{slug}${TICK})`;

        expect(findSqlInjectionIssues(source)).toHaveLength(1);
    });

    test('passes a parameterised quoted raw call', () => {
        const source = `db.connection.raw(${QUOTE}SELECT * FROM t WHERE slug = ?${QUOTE}, [slug])`;

        expect(findSqlInjectionIssues(source)).toHaveLength(0);
    });

    test('passes a placeholder-only template', () => {
        const source = `db.connection.raw(${TICK}SELECT * FROM t WHERE slug = ?${TICK}, [slug])`;

        expect(findSqlInjectionIssues(source)).toHaveLength(0);
    });

    test('passes a template literal with no concatenation', () => {
        const source = `db.connection.raw(${TICK}SELECT 1${TICK})`;

        expect(findSqlInjectionIssues(source)).toHaveLength(0);
    });
});
