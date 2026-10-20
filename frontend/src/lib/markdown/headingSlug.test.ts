import GithubSlugger from 'github-slugger';
import {describe, expect, test} from 'vitest';

import {createHeadingSlugger} from './headingSlug';

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

    test('createHeadingSlugger matches a stateful slugger across a document', () => {
        const ours = createHeadingSlugger();
        const reference = new GithubSlugger();

        for (const heading of [...HEADINGS, ...HEADINGS]) {
            expect(ours.slug(heading), heading).toBe(reference.slug(heading));
        }
    });
});
