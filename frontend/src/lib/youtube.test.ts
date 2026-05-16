import {describe, expect, test} from 'vitest';

import {extractYouTubeVideoId, toYouTubeEmbedUrl} from './youtube';

// Real YouTube video IDs are exactly 11 chars from [a-zA-Z0-9_-].
const ID = 'rCJlSgbiCQA';

describe('extractYouTubeVideoId', () => {
    test.each([
        [`https://www.youtube.com/watch?v=${ID}`, ID],
        [`https://youtube.com/watch?v=${ID}`, ID],
        [`https://m.youtube.com/watch?v=${ID}`, ID],
        [`https://youtu.be/${ID}`, ID],
        [`https://www.youtube.com/embed/${ID}`, ID],
        [`https://www.youtube-nocookie.com/embed/${ID}`, ID],
        [`https://youtube.com/live/${ID}`, ID],
        [`https://www.youtube.com/watch?v=${ID}&feature=shared`, ID],
        [`https://youtu.be/${ID}?t=42`, ID],
    ])('%s → %s', (url, expected) => {
        expect(extractYouTubeVideoId(url)).toBe(expected);
    });

    test.each([
        ['https://vimeo.com/12345', null],
        ['not a url at all', null],
        ['https://www.youtube.com/watch?v=tooshort', null],
        ['', null],
    ])('%s → null', (url, expected) => {
        expect(extractYouTubeVideoId(url)).toBe(expected);
    });

    test('null/undefined → null', () => {
        expect(extractYouTubeVideoId(null)).toBeNull();
        expect(extractYouTubeVideoId(undefined)).toBeNull();
    });
});

describe('toYouTubeEmbedUrl', () => {
    test('default → youtube.com/embed', () => {
        expect(toYouTubeEmbedUrl(`https://youtu.be/${ID}`)).toBe(`https://www.youtube.com/embed/${ID}`);
    });

    test('useNoCookie=true → youtube-nocookie.com/embed', () => {
        expect(toYouTubeEmbedUrl(`https://www.youtube.com/watch?v=${ID}`, true))
            .toBe(`https://www.youtube-nocookie.com/embed/${ID}`);
    });

    test('non-YouTube URL → null', () => {
        expect(toYouTubeEmbedUrl('https://vimeo.com/12345')).toBeNull();
    });

    test('null → null', () => {
        expect(toYouTubeEmbedUrl(null)).toBeNull();
    });
});
