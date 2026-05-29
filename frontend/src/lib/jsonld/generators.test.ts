import {describe, expect, test} from 'vitest';

import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';

import {generateArticleJsonLd} from './article';
import {generateAuthorProfileJsonLd} from './author';
import {generateBreadcrumbJsonLd} from './breadcrumb';
import {generatePodcastJsonLd} from './podcast';

const article: StrapiArticle = {
    id: 1,
    slug: 'hello-world',
    title: 'Hello World',
    description: 'A great article',
    content: 'Body content',
    publishedAt: '2026-04-20T09:00:00.000Z',
    date: null,
    wordCount: 1234,
    cover: {url: 'https://cdn.example.test/cover.jpg', width: 1200, height: 630},
    categories: [{slug: 'news', title: 'News'}],
    authors: [{id: 7, title: 'Jane', slug: 'jane'}],
};

describe('generateArticleJsonLd', () => {
    test('produces a BlogPosting with the expected core fields', () => {
        const jsonLd = generateArticleJsonLd(article);
        expect(jsonLd['@type']).toBe('BlogPosting');
        expect(jsonLd.headline).toBe('Hello World');
        expect(jsonLd.description).toBe('A great article');
        expect(jsonLd.inLanguage).toBe('de-DE');
        expect(jsonLd.datePublished).toBe('2026-04-20T09:00:00.000Z');
        expect(jsonLd.articleSection).toBe('News');
        expect(jsonLd.keywords).toBe('News');
        expect(jsonLd.wordCount).toBe(1234);
        expect(jsonLd.url).toMatch(/\/artikel\/hello-world$/);
        expect(jsonLd.mainEntityOfPage).toBe(jsonLd.url);
    });

    test('includes the cover image and author', () => {
        const jsonLd = generateArticleJsonLd(article);
        expect(jsonLd.image).toEqual([
            {
                '@context': 'https://schema.org',
                '@type': 'ImageObject',
                url: 'https://cdn.example.test/cover.jpg',
                width: 1200,
                height: 630,
            },
        ]);
        expect(Array.isArray(jsonLd.author)).toBe(true);
        expect(jsonLd.author?.[0]?.name).toBe('Jane');
    });

    test('derives a description from content when none is provided', () => {
        const jsonLd = generateArticleJsonLd({...article, description: undefined, content: 'Derived body text'});
        expect(jsonLd.description).toBe('Derived body text');
    });
});

const podcast: StrapiPodcast = {
    id: 2,
    slug: 'episode-001',
    title: 'Episode 001',
    description: 'Episode description',
    publishedAt: '2026-04-20T09:00:00.000Z',
    date: null,
    duration: 3540,
    shownotes: 'notes',
    file: {url: 'https://cdn.example.test/ep.mp3', mime: 'audio/mpeg'},
    cover: {url: 'https://cdn.example.test/cover.jpg', width: 1400, height: 1400},
    categories: [],
    authors: [],
};

describe('generatePodcastJsonLd', () => {
    test('produces a PodcastEpisode with audio and series info', () => {
        const jsonLd = generatePodcastJsonLd(podcast);
        expect(jsonLd['@type']).toBe('PodcastEpisode');
        expect(jsonLd.name).toBe('Episode 001');
        expect(jsonLd.duration).toBe('PT59M');
        expect(jsonLd.associatedMedia?.contentUrl).toBe('https://cdn.example.test/ep.mp3');
        expect(jsonLd.associatedMedia?.encodingFormat).toBe('audio/mpeg');
        expect(jsonLd.partOfSeries?.name).toBe('M10Z Podcasts');
        expect(jsonLd.url).toMatch(/\/podcasts\/episode-001$/);
    });
});

describe('generateAuthorProfileJsonLd', () => {
    test('wraps the author Person inside a ProfilePage', () => {
        const jsonLd = generateAuthorProfileJsonLd({id: 1, title: 'Jane', slug: 'jane'});
        expect(jsonLd['@type']).toBe('ProfilePage');
        expect(jsonLd.mainEntity['@type']).toBe('Person');
        expect(jsonLd.mainEntity.name).toBe('Jane');
        expect(jsonLd.inLanguage).toBe('de-DE');
        expect(jsonLd.isPartOf?.name).toBe('Mindestens 10 Zeichen');
    });
});

describe('generateBreadcrumbJsonLd', () => {
    test('builds an ordered BreadcrumbList with absolute item URLs', () => {
        const jsonLd = generateBreadcrumbJsonLd([
            {name: 'Home', path: '/'},
            {name: 'Artikel', path: '/artikel'},
        ]);
        expect(jsonLd['@type']).toBe('BreadcrumbList');
        expect(jsonLd.itemListElement).toHaveLength(2);
        expect(jsonLd.itemListElement[0]).toMatchObject({position: 1, name: 'Home'});
        expect(jsonLd.itemListElement[1]).toMatchObject({position: 2, name: 'Artikel'});
        expect(jsonLd.itemListElement[1].item).toMatch(/\/artikel$/);
    });
});
