import {describe, expect, test} from 'vitest';

import {
    type AudioFeedConfig,
    generateAudioFeedXml,
    normalizeEnclosureLengthBytes,
    type StrapiAudioFeedSingle,
    type StrapiPodcast,
} from './audiofeed';
import {sha256Hex} from './xml';

const baseCfg: AudioFeedConfig = {
    siteUrl: 'https://m10z.de',
    ttlSeconds: 60,
    language: 'de',
    copyright: 'All rights reserved',
    webMaster: 'm10z@example.test',
    authorEmail: 'm10z@example.test',
    itunesAuthor: 'M10Z',
    itunesExplicit: 'false',
    itunesType: 'episodic',
    podcastGuid: 'TEST-GUID',
};

const channel: StrapiAudioFeedSingle['channel'] = {
    title: 'M10Z Podcast',
    description: 'Test feed',
    mail: 'm10z@example.test',
    // Absolute URL so the generator needs no STRAPI_URL env to resolve media.
    image: {url: 'https://cdn.example.test/cover.jpg', mime: 'image/jpeg', width: 1400, height: 1400, sizeInBytes: 1000},
};

const episode: StrapiPodcast = {
    id: 1,
    slug: 'episode-001',
    title: 'Episode 001',
    description: 'desc',
    publishedAt: '2026-04-20T09:00:00.000Z',
    date: null,
    duration: 3540,
    shownotes: 'notes',
    file: {url: 'https://cdn.example.test/episode-001.mp3', mime: 'audio/mpeg', sizeInBytes: 45_000_000},
    cover: null,
    banner: null,
    authors: [],
    categories: [],
};

function parseEnclosure(xml: string): {url: string; length: string; type: string; guid: string} {
    const enc = /<enclosure url="([^"]+)" length="(\d+)" type="([^"]+)"\/>/.exec(xml);
    const guid = /<guid isPermaLink="false">([a-f0-9]+)<\/guid>/.exec(xml);
    if (!enc || !guid) throw new Error('feed missing enclosure or guid');
    return {url: enc[1], length: enc[2], type: enc[3], guid: guid[1]};
}

function render(cfg: AudioFeedConfig): string {
    return generateAudioFeedXml({cfg, channel, episodeFooter: null, episodes: [episode]}).xml;
}

describe('generateAudioFeedXml — download tracking', () => {
    test('tracking off → <enclosure> uses the direct Strapi file URL', () => {
        const {url} = parseEnclosure(render(baseCfg));
        expect(url).toBe('https://cdn.example.test/episode-001.mp3');
    });

    test('tracking on → <enclosure> uses the on-domain tracking endpoint URL', () => {
        const {url} = parseEnclosure(render({...baseCfg, downloadTracking: true}));
        expect(url).toBe('https://m10z.de/api/podcast-download/episode-001');
    });

    test('GUID, length and type are identical whether tracking is on or off', () => {
        const off = parseEnclosure(render(baseCfg));
        const on = parseEnclosure(render({...baseCfg, downloadTracking: true}));
        // GUID is derived from the real Strapi URL, so toggling tracking must not change episode identity.
        expect(on.guid).toBe(off.guid);
        expect(on.length).toBe(off.length);
        expect(on.type).toBe(off.type);
    });
});

describe('normalizeEnclosureLengthBytes', () => {
    test('uses sizeInBytes when present (floored, clamped to 0)', () => {
        expect(normalizeEnclosureLengthBytes({sizeInBytes: 1234.9})).toBe(1234);
        expect(normalizeEnclosureLengthBytes({sizeInBytes: -5})).toBe(0);
    });

    test('interprets `size` as kilobytes when sizeInBytes is absent', () => {
        expect(normalizeEnclosureLengthBytes({size: 10})).toBe(10 * 1024);
    });

    test('prefers sizeInBytes over size', () => {
        expect(normalizeEnclosureLengthBytes({sizeInBytes: 2048, size: 1})).toBe(2048);
    });

    test('returns undefined when no usable size is available', () => {
        expect(normalizeEnclosureLengthBytes({})).toBeUndefined();
        expect(normalizeEnclosureLengthBytes({sizeInBytes: Number.NaN})).toBeUndefined();
    });
});

describe('generateAudioFeedXml — channel & item structure', () => {
    test('renders iTunes channel metadata and a self atom:link', () => {
        const {xml} = generateAudioFeedXml({cfg: baseCfg, channel, episodeFooter: null, episodes: [episode]});
        expect(xml).toContain('<title>M10Z Podcast</title>');
        expect(xml).toContain('<itunes:type>episodic</itunes:type>');
        expect(xml).toContain('<podcast:guid>TEST-GUID</podcast:guid>');
        expect(xml).toContain('<atom:link href="https://m10z.de/audiofeed.xml" rel="self" type="application/rss+xml"/>');
    });

    test('derives the item GUID from the real Strapi file URL', () => {
        const {xml} = generateAudioFeedXml({cfg: baseCfg, channel, episodeFooter: null, episodes: [episode]});
        expect(xml).toContain(`<guid isPermaLink="false">${sha256Hex(episode.file.url as string)}</guid>`);
        expect(xml).toContain('<itunes:duration>3540</itunes:duration>');
        expect(xml).toContain('<link>https://m10z.de/podcasts/episode-001</link>');
    });

    test('reports renderedEpisodeCount and caching metadata', () => {
        const result = generateAudioFeedXml({cfg: baseCfg, channel, episodeFooter: null, episodes: [episode]});
        expect(result.renderedEpisodeCount).toBe(1);
        expect(result.etagSeed).toBe('1:2026-04-20T09:00:00.000Z');
        expect(result.lastModified?.toISOString()).toBe('2026-04-20T09:00:00.000Z');
    });

    test('skips episodes that have no resolvable enclosure URL', () => {
        const noFile: StrapiPodcast = {...episode, slug: 'no-file', file: {}};
        const result = generateAudioFeedXml({
            cfg: baseCfg,
            channel,
            episodeFooter: null,
            episodes: [episode, noFile],
        });
        // Both episodes are counted in the etag seed, but only one is rendered.
        expect(result.renderedEpisodeCount).toBe(1);
        expect(result.etagSeed.startsWith('2:')).toBe(true);
        expect(result.xml).not.toContain('/podcasts/no-file');
    });

    test('orders episodes newest-first', () => {
        const older: StrapiPodcast = {...episode, slug: 'older', publishedAt: '2026-01-01T00:00:00.000Z'};
        const newer: StrapiPodcast = {...episode, slug: 'newer', publishedAt: '2026-06-01T00:00:00.000Z'};
        const {xml} = generateAudioFeedXml({cfg: baseCfg, channel, episodeFooter: null, episodes: [older, newer]});
        expect(xml.indexOf('/podcasts/newer')).toBeLessThan(xml.indexOf('/podcasts/older'));
    });
});
