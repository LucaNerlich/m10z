import {describe, expect, test} from 'vitest';

import {slugifyUmami, umamiEventId, umamiExternalLinkEvent} from './umami';

describe('slugifyUmami', () => {
    test('lowercases, strips diacritics, and dashes punctuation', () => {
        expect(slugifyUmami('Über uns!')).toBe('uber-uns');
    });

    test('expands ampersands to "and"', () => {
        expect(slugifyUmami('R&D')).toBe('r-and-d');
    });

    test('collapses repeated separators and trims edges', () => {
        expect(slugifyUmami('  --Hello   World--  ')).toBe('hello-world');
    });
});

describe('umamiEventId', () => {
    test('joins non-empty trimmed parts with dashes', () => {
        expect(umamiEventId(['Artikel', null, 42, '  Lesen  '])).toBe('artikel-42-lesen');
    });

    test('falls back to "click" when nothing usable remains', () => {
        expect(umamiEventId([null, undefined, '   '])).toBe('click');
    });
});

describe('umamiExternalLinkEvent', () => {
    test('returns a generic id for empty input', () => {
        expect(umamiExternalLinkEvent('')).toBe('outbound-link');
    });

    test('classifies mailto and tel links', () => {
        expect(umamiExternalLinkEvent('mailto:hi@m10z.de')).toBe('outbound-mailto');
        expect(umamiExternalLinkEvent('tel:+49123')).toBe('outbound-tel');
    });

    test('builds an id from host plus first path segments', () => {
        expect(umamiExternalLinkEvent('https://forum.m10z.de/threads/1')).toBe('outbound-forum-m10z-de-threads-1');
    });

    test('supports a custom prefix', () => {
        expect(umamiExternalLinkEvent('https://discord.gg', 'social')).toBe('social-discord-gg');
    });

    test('handles protocol-relative URLs', () => {
        expect(umamiExternalLinkEvent('//example.com/page')).toBe('outbound-example-com-page');
    });
});
