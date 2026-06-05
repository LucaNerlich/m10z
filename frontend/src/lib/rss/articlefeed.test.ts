import {describe, expect, test} from 'vitest';

import {generateArticleFeedXml, type StrapiArticle, type StrapiArticleFeedSingle} from './articlefeed';
import {sha256Hex} from './xml';

const siteUrl = 'https://m10z.de';

const channel: StrapiArticleFeedSingle['channel'] = {
    title: 'M10Z',
    description: 'Mindestens 10 Zeichen',
    mail: 'm10z@example.test',
    // Absolute URL so the generator needs no STRAPI_URL env to resolve the channel image.
    image: {url: 'https://cdn.example.test/cover.jpg', mime: 'image/jpeg'},
};

function makeArticle(overrides: Partial<StrapiArticle> = {}): StrapiArticle {
    return {
        id: 1,
        slug: 'hello-world',
        title: 'Hello World',
        description: 'A short description',
        content: 'Some **bold** text.',
        publishedAt: '2026-04-20T09:00:00.000Z',
        date: null,
        categories: [],
        authors: [],
        ...overrides,
    };
}

function render(articles: StrapiArticle[]) {
    return generateArticleFeedXml({siteUrl, channel, articles});
}

describe('generateArticleFeedXml — channel header', () => {
    test('renders the channel metadata with escaping and language', () => {
        const {xml} = render([makeArticle()]);
        expect(xml).toContain('<title>M10Z</title>');
        expect(xml).toContain('<link>https://m10z.de</link>');
        expect(xml).toContain('<description>Mindestens 10 Zeichen</description>');
        expect(xml).toContain('<language>de</language>');
        expect(xml).toContain('<atom:link href="https://m10z.de/rss.xml" rel="self" type="application/rss+xml"/>');
    });
});

describe('generateArticleFeedXml — items', () => {
    test('builds a permalink and a sha256 guid derived from it', () => {
        const {xml} = render([makeArticle({slug: 'hello-world'})]);
        const link = 'https://m10z.de/artikel/hello-world';
        expect(xml).toContain(`<link>${link}</link>`);
        expect(xml).toContain(`<guid isPermaLink="false">${sha256Hex(link)}</guid>`);
    });

    test('percent-encodes slugs in the link', () => {
        const {xml} = render([makeArticle({slug: 'a b/c'})]);
        expect(xml).toContain('<link>https://m10z.de/artikel/a%20b%2Fc</link>');
    });

    test('escapes special characters in the title', () => {
        const {xml} = render([makeArticle({title: 'Tom & Jerry <3'})]);
        expect(xml).toContain('<title>Tom &amp; Jerry &lt;3</title>');
    });

    test('wraps rendered content in a CDATA content:encoded block', () => {
        const {xml} = render([makeArticle({content: 'Some **bold** text.'})]);
        expect(xml).toContain('<content:encoded><![CDATA[');
        expect(xml).toContain('<strong>bold</strong>');
    });

    test('falls back to the first category description when the article has none', () => {
        const {xml} = render([
            makeArticle({description: '', categories: [{slug: 'c', description: 'Category blurb'}]}),
        ]);
        expect(xml).toContain('<description>Category blurb</description>');
    });
});

describe('generateArticleFeedXml — ordering & caching metadata', () => {
    test('sorts items newest-first by effective date', () => {
        const older = makeArticle({slug: 'older', publishedAt: '2026-01-01T00:00:00.000Z'});
        const newer = makeArticle({slug: 'newer', publishedAt: '2026-06-01T00:00:00.000Z'});
        const {xml, lastModified} = render([older, newer]);
        expect(xml.indexOf('/artikel/newer')).toBeLessThan(xml.indexOf('/artikel/older'));
        expect(lastModified?.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    });

    test('prefers the content `date` override over publishedAt for ordering', () => {
        const article = makeArticle({publishedAt: '2026-01-01T00:00:00.000Z', date: '2026-09-09T00:00:00.000Z'});
        const {lastModified} = render([article]);
        expect(lastModified?.toISOString()).toBe('2026-09-09T00:00:00.000Z');
    });

    test('produces an etag seed of "<count>:<latest ISO>"', () => {
        const {etagSeed} = render([
            makeArticle({slug: 'a', publishedAt: '2026-01-01T00:00:00.000Z'}),
            makeArticle({slug: 'b', publishedAt: '2026-06-01T00:00:00.000Z'}),
        ]);
        expect(etagSeed).toBe('2:2026-06-01T00:00:00.000Z');
    });

    test('handles an empty article list', () => {
        const {etagSeed, lastModified} = render([]);
        expect(etagSeed).toBe('0:none');
        expect(lastModified).toBeNull();
    });
});
