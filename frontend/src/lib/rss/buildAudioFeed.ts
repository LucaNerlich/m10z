import {isPodcastDownloadTrackingEnabled} from '@/src/lib/analytics/podcastDownload';
import {
    type AudioFeedConfig,
    type AudioFeedMarkdownConverter,
    type AudioFeedTiming,
    generateAudioFeedXml,
} from '@/src/lib/rss/audiofeed';
import {
    FEED_CHANNEL_SINGLE_QUERY,
    FEED_SITE_URL,
    computeFeedEtag,
    createFeedListQuery,
    feedListPopulate,
    fetchFeedSourceData,
} from '@/src/lib/rss/feedDefinition';
import {createFeedStrapiFetcher} from '@/src/lib/rss/feedFetcher';
import {type FeedBuilt} from '@/src/lib/rss/feedCache';
import {markdownToHtml} from '@/src/lib/rss/markdownToHtml';
import {sha256Hex} from '@/src/lib/rss/xml';
import {type StrapiAudioFeedSingle, type StrapiPodcast} from '@/src/lib/strapi/contentTypes';
import {contentTag, feedSourceTag, feedTag} from '@/src/lib/strapi/cacheTags';

export type AudioFeedBuildTiming = {
    episodeCount: number;
    renderedEpisodeCount: number;
    timing: AudioFeedTiming;
    avgPerEpisodeMs: {
        markdownConversionMs: number;
        guidGenerationMs: number;
        fileMetadataMs: number;
        enclosureMs: number;
    };
    markdownCache?: {hits: number; misses: number; size: number};
};

const fetcher = createFeedStrapiFetcher([feedTag('audio'), contentTag('podcast'), feedSourceTag('audio')]);

const buildPodcastListQuery = createFeedListQuery({
    populate: {...feedListPopulate, file: {populate: '*'}},
    fields: ['slug', 'duration', 'shownotes', 'wordCount', 'publishedAt', 'title', 'description', 'date'],
});

function getAudioFeedDefaults(): AudioFeedConfig {
    return {
        siteUrl: FEED_SITE_URL,
        ttlSeconds: 60,
        language: 'de',
        copyright: 'All rights reserved',
        webMaster: 'm10z@posteo.de',
        authorEmail: 'm10z@posteo.de',
        itunesAuthor: 'M10Z',
        itunesExplicit: 'false',
        itunesType: 'episodic',
        podcastGuid: 'E9QfcR8TYeotS5ceJLmn',
        downloadTracking: isPodcastDownloadTrackingEnabled(),
    };
}

/** Build the audio RSS feed document (fetch → generate → etag). */
export async function buildAudioFeed(): Promise<{built: FeedBuilt; buildTiming: AudioFeedBuildTiming}> {
    const {single: feed, items: episodes} = await fetchFeedSourceData<StrapiAudioFeedSingle, StrapiPodcast>({
        fetcher,
        singlePathWithQuery: `/api/audio-feed?${FEED_CHANNEL_SINGLE_QUERY}`,
        listBasePath: '/api/podcasts',
        listQueryBuilder: buildPodcastListQuery,
        resolveMaxItems: () => Number(process.env.FEED_AUDIO_MAX_ITEMS ?? '') || 1000,
    });
    const cfg = getAudioFeedDefaults();

    const markdownCache = new Map<string, string>();
    let markdownCacheHits = 0;
    let markdownCacheMisses = 0;

    const markdownConverter: AudioFeedMarkdownConverter = ({episodeId, kind, markdownText}) => {
        if (!markdownText) return '';
        const key = `${episodeId}:${kind}:${sha256Hex(markdownText)}`;
        const hit = markdownCache.get(key);
        if (hit !== undefined) {
            markdownCacheHits += 1;
            return hit;
        }
        markdownCacheMisses += 1;
        const html = markdownToHtml(markdownText);
        markdownCache.set(key, html);
        return html;
    };

    const {xml, etagSeed, lastModified, timing, renderedEpisodeCount} = generateAudioFeedXml({
        cfg,
        channel: feed.channel,
        episodeFooter: feed.episodeFooter,
        episodes,
        markdownConverter,
    });

    const etag = computeFeedEtag(etagSeed, xml);

    const buildTiming: AudioFeedBuildTiming = {
        episodeCount: episodes.length,
        renderedEpisodeCount,
        timing,
        avgPerEpisodeMs: {
            markdownConversionMs: timing.markdownConversion.avgMs,
            guidGenerationMs: timing.guidGeneration.avgMs,
            fileMetadataMs: timing.fileMetadata.avgMs,
            enclosureMs: timing.enclosure.avgMs,
        },
        markdownCache: {hits: markdownCacheHits, misses: markdownCacheMisses, size: markdownCache.size},
    };

    return {
        built: {xml, etag, lastModified, itemCount: episodes.length},
        buildTiming,
    };
}
