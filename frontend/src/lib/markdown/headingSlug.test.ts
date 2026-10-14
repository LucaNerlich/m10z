import GithubSlugger from 'github-slugger';
import {describe, expect, test} from 'vitest';

import {createHeadingSlugger, slugifyHeadingText} from './headingSlug';

describe('slugifyHeadingText', () => {
    test('lowercases and hyphenates', () => {
        expect(slugifyHeadingText('Hello World')).toBe('hello-world');
    });

    test('strips markdown-ish characters and keeps umlauts', () => {
        // The en-dash is removed rather than replaced, so its two neighbouring
        // spaces become two dashes - that is the ID rehype-slug generates.
        expect(slugifyHeadingText('Was ist das? – Über uns!')).toBe('was-ist-das--über-uns');
    });

    // github-slugger removes `&` rather than spelling it out, so "Tom & Jerry"
    // leaves the two surrounding spaces as two dashes.
    test('removes ampersands like github-slugger', () => {
        expect(slugifyHeadingText('Tom & Jerry')).toBe('tom--jerry');
    });

    test('emits one dash per space and does not trim them', () => {
        expect(slugifyHeadingText('  Spaces   everywhere  ')).toBe('--spaces---everywhere--');
    });
});

describe('createHeadingSlugger', () => {
    test('first occurrence has no suffix; duplicates get -1, -2', () => {
        const slugger = createHeadingSlugger();
        expect(slugger.slug('Intro')).toBe('intro');
        expect(slugger.slug('Intro')).toBe('intro-1');
        expect(slugger.slug('Intro')).toBe('intro-2');
        expect(slugger.slug('Other')).toBe('other');
    });
});

// The whole point of this module: the IDs the table of contents resolves must be the
// IDs rehype-slug generated. Assert parity against github-slugger itself rather than
// against hand-written expectations, so divergence fails here instead of silently
// breaking anchors.
describe('parity with github-slugger (what rehype-slug uses)', () => {
    const HEADINGS = [
        'Hello World',
        'Tom & Jerry',
        '  Spaces   everywhere  ',
        'Was ist das? – Über uns!',
        'C++ & Rust: 1. Überblick',
        'A/B testing',
        'snake_case_and-dashes',
        '100 %',
        'Einführung in OOP (Teil 2)',
        '',
    ];

    test('slugifyHeadingText matches a fresh slugger for every heading', () => {
        for (const heading of HEADINGS) {
            expect(slugifyHeadingText(heading), heading).toBe(new GithubSlugger().slug(heading));
        }
    });

    test('createHeadingSlugger matches a stateful slugger across a document', () => {
        const ours = createHeadingSlugger();
        const reference = new GithubSlugger();

        for (const heading of [...HEADINGS, ...HEADINGS]) {
            expect(ours.slug(heading), heading).toBe(reference.slug(heading));
        }
    });
});
