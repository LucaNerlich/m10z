import {describe, expect, test} from 'vitest';

import {type StrapiPodcast} from '@/src/lib/strapi/contentTypes';

import {buildPodloveEpisodeConfig, buildPodlovePlayerConfig, formatPodloveDuration} from './buildConfig';

function makePodcast(overrides: Partial<StrapiPodcast> = {}): StrapiPodcast {
    return {
        id: 1,
        slug: 'test-episode',
        publishedAt: '2026-04-20T09:00:00.000Z',
        title: 'Test Episode',
        duration: 3661,
        file: {},
        ...overrides,
    } as StrapiPodcast;
}

describe('formatPodloveDuration', () => {
    test.each([
        [0, '00:00:00.000'],
        [-5, '00:00:00.000'],
        [Number.NaN, '00:00:00.000'],
        [Number.POSITIVE_INFINITY, '00:00:00.000'],
        [5, '00:00:05.000'],
        [65, '00:01:05.000'],
        [3661, '01:01:01.000'],
        [45296, '12:34:56.000'],
    ])('formats %s seconds as %s', (input, expected) => {
        expect(formatPodloveDuration(input)).toBe(expected);
    });

    test('floors fractional seconds', () => {
        expect(formatPodloveDuration(90.9)).toBe('00:01:30.000');
    });
});

describe('buildPodloveEpisodeConfig', () => {
    test('builds a version-5 episode with audio and files assets', () => {
        const episode = buildPodloveEpisodeConfig(makePodcast(), {
            audioUrl: '/api/podcast-download/test-episode',
            audioMime: 'audio/mpeg',
            audioSizeBytes: 1024,
            posterUrl: 'https://m10z.de/cover.jpg',
            link: 'https://m10z.de/podcasts/test-episode',
        });

        expect(episode.version).toBe(5);
        expect(episode.title).toBe('Test Episode');
        expect(episode.duration).toBe('01:01:01.000');
        expect(episode.publicationDate).toBe('2026-04-20T09:00:00.000Z');
        expect(episode.poster).toBe('https://m10z.de/cover.jpg');
        expect(episode.link).toBe('https://m10z.de/podcasts/test-episode');
        expect(episode.audio).toEqual([
            {url: '/api/podcast-download/test-episode', mimeType: 'audio/mpeg', title: 'Audio', size: '1024'},
        ]);
        expect(episode.files).toEqual([
            {url: '/api/podcast-download/test-episode', mimeType: 'audio/mpeg', title: 'Herunterladen', size: '1024'},
        ]);
    });

    test('uses the effective date override when present', () => {
        const episode = buildPodloveEpisodeConfig(
            makePodcast({date: '2026-01-01T00:00:00.000Z', publishedAt: '2026-04-20T09:00:00.000Z'}),
            {audioUrl: '/audio.mp3'},
        );
        expect(episode.publicationDate).toBe('2026-01-01T00:00:00.000Z');
    });

    test('falls back to audio/mpeg and omits size for missing/invalid values', () => {
        const episode = buildPodloveEpisodeConfig(makePodcast(), {
            audioUrl: '/audio.mp3',
            audioMime: '   ',
            audioSizeBytes: 0,
        });
        expect(episode.audio[0].mimeType).toBe('audio/mpeg');
        expect(episode.audio[0].size).toBeUndefined();
        expect(episode.files?.[0].size).toBeUndefined();
    });

    test('omits summary when description is empty', () => {
        const episode = buildPodloveEpisodeConfig(makePodcast({description: '  '}), {audioUrl: '/audio.mp3'});
        expect(episode.summary).toBeUndefined();
    });

    test('includes summary when description is present', () => {
        const episode = buildPodloveEpisodeConfig(makePodcast({description: 'Eine Folge'}), {audioUrl: '/audio.mp3'});
        expect(episode.summary).toBe('Eine Folge');
    });

    test('omits optional url fields when not provided', () => {
        const episode = buildPodloveEpisodeConfig(makePodcast(), {audioUrl: '/audio.mp3'});
        expect(episode.poster).toBeUndefined();
        expect(episode.link).toBeUndefined();
    });
});

describe('buildPodlovePlayerConfig', () => {
    test('returns the CDN config with brand theme, share tabs, and subscribe button', () => {
        const config = buildPodlovePlayerConfig();
        expect(config.version).toBe(5);
        // No base: the CDN embed build self-resolves its chunks.
        expect(config.base).toBeUndefined();
        expect(config.language).toBe('de');
        expect(config.activeTab).toBe('files');
        expect(config.theme?.tokens?.brand).toBe('#ef702c');
        expect(config.share?.channels).toEqual(['mail', 'link']);
        expect(config.share?.sharePlaytime).toBe(true);
    });

    test('wires the subscribe button to the audio feed with only an rss client', () => {
        const config = buildPodlovePlayerConfig();
        const subscribe = config['subscribe-button'];
        expect(subscribe).toBeDefined();
        expect(subscribe?.feed).toMatch(/\/audiofeed\.xml$/);
        expect(subscribe?.clients.map((c) => c.id)).toEqual(['rss']);
        const rss = subscribe?.clients.find((c) => c.id === 'rss');
        expect(rss?.service).toBe(subscribe?.feed);
    });
});
