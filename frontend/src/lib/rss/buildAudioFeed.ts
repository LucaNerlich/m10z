import {isPodcastDownloadTrackingEnabled} from '@/src/lib/analytics/podcastDownload';
import {
    type AudioFeedConfig,
    type AudioFeedMarkdownConverter,
    type AudioFeedTiming,
    generateAudioFeedXml,
} from '@/src/lib/rss/audiofeed';
import {
    computeFeedEtag,
    FEED_CHANNEL_SINGLE_QUERY,
    FEED_SITE_URL,
    feedListPopulate,
    fetchFeedSourceData,
} from '@/src/lib/rss/feedDefinition';
import {createPrivilegedFeedReader} from '@/src/lib/strapi/contentAccess';
import {buildFeedListQuery} from '@/src/lib/strapi-queries/queries';
import {type FeedBuilt} from '@/src/lib/rss/feedCache';
import {markdownToHtml} from '@/src/lib/rss/markdownToHtml';
import {type StrapiAudioFeedSingle, type StrapiPodcast} from '@/src/lib/strapi/contentTypes';
import {feedSourceTag, feedTag, typeTag} from '@/src/lib/shared/contracts/strapi-contract/tags';
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
};

const fetcher = createPrivilegedFeedReader([feedTag('audio'), typeTag('podcast'), feedSourceTag('audio')]);

const buildPodcastListQuery = buildFeedListQuery({
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

    // Each (episode, kind) pair is converted exactly once per build, so a cache
    // scoped to this build could never hit: the previous Map was created here and
    // its hit counter always read 0, while hashing every shownotes string on the
    // hot path. Convert directly.
    const markdownConverter: AudioFeedMarkdownConverter = ({markdownText}) =>
        markdownText ? markdownToHtml(markdownText) : '';

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
    };

    return {
        built: {xml, etag, lastModified, itemCount: episodes.length},
        buildTiming,
    };
}
