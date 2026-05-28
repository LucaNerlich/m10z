import {describe, expect, test} from 'vitest';

import {
    type AudioFeedConfig,
    generateAudioFeedXml,
    type StrapiAudioFeedSingle,
    type StrapiPodcast,
} from './audiofeed';

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
