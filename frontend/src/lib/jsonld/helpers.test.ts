import {describe, expect, test} from 'vitest';

import {
    authorToPerson,
    buildImageObject,
    formatIso8601Date,
    formatIso8601Duration,
    imagesEqual,
    mediaToImage,
    stringifyJsonLd,
} from './helpers';

describe('formatIso8601Date', () => {
    test('converts a valid date string to ISO-8601', () => {
        expect(formatIso8601Date('2026-04-20T09:00:00.000Z')).toBe('2026-04-20T09:00:00.000Z');
    });

    test('returns undefined for empty or invalid input', () => {
        expect(formatIso8601Date(null)).toBeUndefined();
        expect(formatIso8601Date(undefined)).toBeUndefined();
        expect(formatIso8601Date('')).toBeUndefined();
        expect(formatIso8601Date('not-a-date')).toBeUndefined();
    });
});

describe('formatIso8601Duration', () => {
    test.each([
        [0, 'PT0S'],
        [5, 'PT5S'],
        [65, 'PT1M5S'],
        [3540, 'PT59M'],
        [3661, 'PT1H1M1S'],
        [3600, 'PT1H'],
    ])('%i seconds → %s', (input, expected) => {
        expect(formatIso8601Duration(input)).toBe(expected);
    });

    test('clamps negative and non-finite values to PT0S', () => {
        expect(formatIso8601Duration(-10)).toBe('PT0S');
        expect(formatIso8601Duration(Number.NaN)).toBe('PT0S');
    });
});

describe('buildImageObject', () => {
    test('includes only positive dimensions', () => {
        expect(buildImageObject('https://x/a.jpg', 100, 50)).toEqual({
            '@context': 'https://schema.org',
            '@type': 'ImageObject',
            url: 'https://x/a.jpg',
            width: 100,
            height: 50,
        });
        expect(buildImageObject('https://x/a.jpg', 0, -1)).toEqual({
            '@context': 'https://schema.org',
            '@type': 'ImageObject',
            url: 'https://x/a.jpg',
        });
    });
});

describe('mediaToImage', () => {
    test('returns undefined when there is no url', () => {
        expect(mediaToImage(undefined)).toBeUndefined();
        expect(mediaToImage({})).toBeUndefined();
    });

    test('returns an ImageObject when width and height are present', () => {
        expect(mediaToImage({url: 'https://x/a.jpg', width: 800, height: 600})).toEqual({
            '@context': 'https://schema.org',
            '@type': 'ImageObject',
            url: 'https://x/a.jpg',
            width: 800,
            height: 600,
        });
    });

    test('returns a plain URL string when dimensions are missing', () => {
        expect(mediaToImage({url: 'https://x/a.jpg'})).toBe('https://x/a.jpg');
    });
});

describe('imagesEqual', () => {
    test('compares by URL across string and ImageObject forms', () => {
        const obj = {'@context': 'https://schema.org', '@type': 'ImageObject', url: 'https://x/a.jpg'} as const;
        expect(imagesEqual(obj, 'https://x/a.jpg')).toBe(true);
        expect(imagesEqual('https://x/a.jpg', 'https://x/b.jpg')).toBe(false);
    });

    test('returns false when either image is missing', () => {
        expect(imagesEqual(undefined, 'https://x/a.jpg')).toBe(false);
        expect(imagesEqual('https://x/a.jpg', undefined)).toBe(false);
    });
});

describe('authorToPerson', () => {
    test('builds a Person with a name fallback and worksFor organization', () => {
        const person = authorToPerson({id: 1});
        expect(person['@type']).toBe('Person');
        expect(person.name).toBe('Unknown Author');
        expect(person.worksFor?.name).toBe('Mindestens 10 Zeichen');
        expect(person.url).toBeUndefined();
    });

    test('adds a profile URL when the author has a slug', () => {
        const person = authorToPerson({id: 1, title: 'Jane', slug: 'jane'});
        expect(person.name).toBe('Jane');
        expect(person.url).toMatch(/\/team\/jane$/);
    });

    test('adds an avatar ImageObject when dimensions are present', () => {
        const person = authorToPerson({
            id: 1,
            title: 'Jane',
            slug: 'jane',
            avatar: {url: 'https://x/avatar.jpg', width: 200, height: 200},
        });
        expect(person.image).toEqual({
            '@context': 'https://schema.org',
            '@type': 'ImageObject',
            url: 'https://x/avatar.jpg',
            width: 200,
            height: 200,
        });
    });
});

describe('stringifyJsonLd', () => {
    test('removes undefined values recursively', () => {
        const result = stringifyJsonLd({a: 1, b: undefined, c: {d: undefined, e: 2}});
        expect(JSON.parse(result)).toEqual({a: 1, c: {e: 2}});
    });

    test('escapes characters that could break out of a script tag', () => {
        const result = stringifyJsonLd({headline: 'pwn </script><script>alert(1)</script>'});
        expect(result).not.toContain('</script>');
        // Still round-trips to the original value.
        expect(JSON.parse(result).headline).toBe('pwn </script><script>alert(1)</script>');
    });
});
