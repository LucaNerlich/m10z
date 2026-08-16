import {describe, expect, test} from 'vitest';

import {createHeadingSlugger, slugifyHeadingText} from './headingSlug';

describe('slugifyHeadingText', () => {
    test('lowercases and hyphenates', () => {
        expect(slugifyHeadingText('Hello World')).toBe('hello-world');
    });

    test('strips markdown-ish characters and keeps umlauts', () => {
        expect(slugifyHeadingText('Was ist das? – Über uns!')).toBe('was-ist-das-über-uns');
    });

    test('maps & to -and-', () => {
        expect(slugifyHeadingText('Tom & Jerry')).toBe('tom-and-jerry');
    });

    test('collapses multiple spaces and strips leading/trailing dashes', () => {
        expect(slugifyHeadingText('  Spaces   everywhere  ')).toBe('spaces-everywhere');
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
