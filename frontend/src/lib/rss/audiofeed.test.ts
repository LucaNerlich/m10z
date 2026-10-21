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
    image: {
        url: 'https://cdn.example.test/cover.jpg',
        mime: 'image/jpeg',
        width: 1400,
        height: 1400,
        sizeInBytes: 1000,
    },
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

describe('generateAudioFeedXml — dates', () => {
    test('falls back to publishedAt when the episode date is unparseable', () => {
        const {xml} = generateAudioFeedXml({
            cfg: baseCfg,
            channel,
            episodeFooter: null,
            episodes: [
                {...episode, date: 'garbage', publishedAt: '2026-04-21T09:00:00.000Z'},
            ],
        });
        expect(xml).toContain('<pubDate>Tue, 21 Apr 2026 09:00:00 GMT</pubDate>');
    });
});

describe('generateAudioFeedXml — download tracking', () => {
    test('tracking off → <enclosure> uses the direct Strapi file URL', () => {
        const {url} = parseEnclosure(render(baseCfg));
        expect(url).toBe('https://cdn.example.test/episode-001.mp3');
    });

    test('tracking on → <enclosure> uses the on-domain tracking endpoint URL with a fake .mp3 suffix', () => {
        const {url} = parseEnclosure(render({...baseCfg, downloadTracking: true}));
        expect(url).toBe('https://m10z.de/api/podcast-download/episode-001.mp3');
    });

    test('GUID, length and type are identical whether tracking is on or off', () => {
        const off = parseEnclosure(render(baseCfg));
        const on = parseEnclosure(render({...baseCfg, downloadTracking: true}));
        // GUID is derived from the real Strapi URL, so toggling tracking must not change episode identity.
        expect(on.guid).toBe(off.guid);
        expect(on.length).toBe(off.length);
        expect(on.type).toBe(off.type);
    });

    test('each episode gets its own slug-specific .mp3-suffixed tracking URL', () => {
        const second: StrapiPodcast = {
            ...episode,
            slug: 'episode-002',
            file: {...episode.file, url: 'https://cdn.example.test/episode-002.mp3'},
        };
        const {xml} = generateAudioFeedXml({
            cfg: {...baseCfg, downloadTracking: true},
            channel,
            episodeFooter: null,
            episodes: [episode, second],
        });
        expect(xml).toContain('<enclosure url="https://m10z.de/api/podcast-download/episode-001.mp3"');
        expect(xml).toContain('<enclosure url="https://m10z.de/api/podcast-download/episode-002.mp3"');
    });
});

describe('normalizeEnclosureLengthBytes', () => {
    test('uses sizeInBytes when present (floored, clamped to 0)', () => {
        expect(normalizeEnclosureLengthBytes({sizeInBytes: 1234.9})).toBe(1234);
        expect(normalizeEnclosureLengthBytes({sizeInBytes: -5})).toBe(0);
    });

    test('interprets `size` as decimal kilobytes when sizeInBytes is absent', () => {
        // Strapi stores `size` as bytes / 1000. Episode pp-25: 78718420 bytes
        // is stored as 78718.42 and must come back as 78718420, not 80607662.
        expect(normalizeEnclosureLengthBytes({size: 10})).toBe(10_000);
        expect(normalizeEnclosureLengthBytes({size: 78_718.42})).toBe(78_718_420);
        // 2.01 * 1000 is 2009.9999999999998 in floating point; the file has 2010 bytes.
        expect(normalizeEnclosureLengthBytes({size: 2.01})).toBe(2010);
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

    test('uses the original cover for <itunes:image>, not the display derivative', () => {
        // Apple requires 1400-3000 px episode art; the `medium` derivative is 750 px.
        const {xml} = generateAudioFeedXml({
            cfg: baseCfg,
            channel,
            episodeFooter: null,
            episodes: [
                {
                    ...episode,
                    cover: {
                        url: 'https://cdn.example.test/cover-original.jpg',
                        mime: 'image/jpeg',
                        width: 3000,
                        height: 3000,
                        formats: {
                            medium: {url: 'https://cdn.example.test/medium_cover.jpg', width: 750, height: 750},
                        },
                    },
                },
            ],
        });

        expect(xml).toContain('<itunes:image href="https://cdn.example.test/cover-original.jpg"/>');
        expect(xml).not.toContain('medium_cover.jpg');
    });

    test('omits <itunes:duration> when the CMS value is null', () => {
        // The CMS field is optional (required: false), so a saved podcast can carry null
        // although the frontend type declares it non-nullable.
        const withoutDuration = {...episode, duration: null as unknown as number};
        const {xml} = generateAudioFeedXml({
            cfg: baseCfg,
            channel,
            episodeFooter: null,
            episodes: [withoutDuration],
        });
        expect(xml).not.toContain('<itunes:duration>');
    });

    test('omits <itunes:duration> for a non-positive value', () => {
        const {xml} = generateAudioFeedXml({
            cfg: baseCfg,
            channel,
            episodeFooter: null,
            episodes: [{...episode, duration: 0}],
        });
        expect(xml).not.toContain('<itunes:duration>');
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

describe('generateAudioFeedXml — feed-wide footer', () => {
    test('converts the footer once for a multi-episode feed', () => {
        const footerCalls: number[] = [];
        const converter = (args: {episodeId: number; kind: 'shownotes' | 'footer'; markdownText: string}) => {
            if (args.kind === 'footer') footerCalls.push(args.episodeId);
            return `<p>${args.markdownText}</p>`;
        };
        const second: StrapiPodcast = {
            ...episode,
            id: 2,
            slug: 'episode-002',
            file: {...episode.file, url: 'https://cdn.example.test/episode-002.mp3'},
        };
        const third: StrapiPodcast = {
            ...episode,
            id: 3,
            slug: 'episode-003',
            file: {...episode.file, url: 'https://cdn.example.test/episode-003.mp3'},
        };

        const {xml, timing} = generateAudioFeedXml({
            cfg: baseCfg,
            channel,
            episodeFooter: 'Support us',
            episodes: [episode, second, third],
            markdownConverter: converter,
        });

        // One feed-wide footer conversion, regardless of episode count.
        expect(footerCalls).toHaveLength(1);
        // The footer conversion is part of the markdown timing breakdown, so
        // diagnostics do not under-report the work hoisting moved out of renderItem.
        expect(timing.markdownConversion.count).toBe(4);
        // The converted footer still lands in every episode description.
        expect(xml.match(/<p>Support us<\/p>/g)).toHaveLength(3);
    });
});
