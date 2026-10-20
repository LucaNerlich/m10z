/**
 * The `youtube` component's URL validation must accept everything the frontend
 * renderer can extract an id from (`src/lib/youtube.ts`), otherwise an editor or API
 * caller cannot store the link YouTube's Share dialog produces.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {describe, expect, test} from 'vitest';

const schema = JSON.parse(
    readFileSync(join(process.cwd(), 'src/components/collection-type/youtube.json'), 'utf8'),
) as {attributes: {url: {regex: string}}};

const pattern = new RegExp(schema.attributes.url.regex);

describe('youtube component url validation', () => {
    test.each([
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ?t=42',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/live/dQw4w9WgXcQ',
        'www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://WWW.YouTube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.COM/watch?v=dQw4w9WgXcQ',
        'https://youtu.BE/dQw4w9WgXcQ',
        '  https://youtu.be/dQw4w9WgXcQ  ',
    ])('accepts %s', (url) => {
        expect(pattern.test(url), url).toBe(true);
    });

    test.each([
        'https://vimeo.com/12345',
        'https://notyoutube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=tooshort',
        'https://www.youtube.com/',
        'javascript:alert(1)',
    ])('rejects %s', (url) => {
        expect(pattern.test(url), url).toBe(false);
    });
});
