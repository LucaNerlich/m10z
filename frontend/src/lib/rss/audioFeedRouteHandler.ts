import {isPodcastDownloadTrackingEnabled} from '@/src/lib/analytics/podcastDownload';
import {recordDiagnosticEvent} from '@/src/lib/diagnostics/runtimeDiagnostics';
import {
    type AudioFeedConfig,
    type AudioFeedMarkdownConverter,
    type AudioFeedTiming,
    generateAudioFeedXml,
    type StrapiAudioFeedSingle,
    type StrapiPodcast,
} from '@/src/lib/rss/audiofeed';
import {
    type BuildSuccessInfo,
    createFeedCache,
    type FeedBuilt,
} from '@/src/lib/rss/feedCache';
import {
    FEED_CHANNEL_SINGLE_QUERY,
    FEED_SITE_URL,
    computeFeedEtag,
    createFeedListQuery,
    feedListPopulate,
    fetchFeedSourceData,
} from '@/src/lib/rss/feedDefinition';
import {createFeedStrapiFetcher} from '@/src/lib/rss/feedFetcher';
import {markdownToHtml} from '@/src/lib/rss/markdownToHtml';
import {sha256Hex} from '@/src/lib/rss/xml';
import {contentTag, feedSourceTag, feedTag} from '@/src/lib/cache/strapiTags';

// Runtime health tracking for the long-lived audio scheduler.
// Detects performance regressions (e.g., memory leaks, slow Strapi responses) by comparing
// recent build durations against the initial build. If the last SLOW_BUILD_WINDOW builds
// all exceed SLOW_BUILD_MULTIPLIER × initial duration, the scheduler is reset.
const BUILD_HISTORY_LIMIT = 20;
const SLOW_BUILD_WINDOW = 3;
const SLOW_BUILD_MULTIPLIER = 2;

let initialBuildDurationMs: number | null = null;
const buildDurationsMs: number[] = [];

type LastBuildTiming = {
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

let lastBuildTiming: LastBuildTiming | null = null;

// `module.hot` is injected by the dev bundler for HMR; not present in production/runtime node.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

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

async function buildAudioFeed(): Promise<FeedBuilt> {
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

    const avgPerEpisodeMs = {
        markdownConversionMs: timing.markdownConversion.avgMs,
        guidGenerationMs: timing.guidGeneration.avgMs,
        fileMetadataMs: timing.fileMetadata.avgMs,
        enclosureMs: timing.enclosure.avgMs,
    };
    lastBuildTiming = {
        episodeCount: episodes.length,
        renderedEpisodeCount,
        timing,
        avgPerEpisodeMs,
        markdownCache: {hits: markdownCacheHits, misses: markdownCacheMisses, size: markdownCache.size},
    };

    return {xml, etag, lastModified, itemCount: episodes.length};
}

function recordAudioBuildHealth({durationMs, built, memoryUsedMB, memoryDeltaMB}: BuildSuccessInfo) {
    if (initialBuildDurationMs === null) {
        initialBuildDurationMs = durationMs;
    }
    buildDurationsMs.push(durationMs);
    if (buildDurationsMs.length > BUILD_HISTORY_LIMIT) {
        buildDurationsMs.splice(0, buildDurationsMs.length - BUILD_HISTORY_LIMIT);
    }

    const thresholdMs = initialBuildDurationMs * SLOW_BUILD_MULTIPLIER;
    const last3 = buildDurationsMs.slice(-SLOW_BUILD_WINDOW);
    const shouldReset =
        last3.length === SLOW_BUILD_WINDOW && last3.every((d) => d > thresholdMs);

    if (durationMs >= 500) {
        recordDiagnosticEvent({
            ts: Date.now(),
            kind: 'route',
            name: 'feed.audio.build.detail',
            ok: true,
            durationMs,
            detail: {
                episodes: built.itemCount,
                memoryUsedMB,
                memoryDeltaMB,
                ...(lastBuildTiming
                    ? {
                          markdownConversionMs: lastBuildTiming.avgPerEpisodeMs.markdownConversionMs,
                          guidGenerationMs: lastBuildTiming.avgPerEpisodeMs.guidGenerationMs,
                          fileMetadataMs: lastBuildTiming.avgPerEpisodeMs.fileMetadataMs,
                          enclosureMs: lastBuildTiming.avgPerEpisodeMs.enclosureMs,
                          timing: lastBuildTiming.timing,
                          renderedEpisodeCount: lastBuildTiming.renderedEpisodeCount,
                          markdownCache: lastBuildTiming.markdownCache,
                      }
                    : {}),
                reset: shouldReset
                    ? {
                          scheduled: true,
                          reason: 'slow_build',
                          last3,
                          thresholdMs,
                          multiplier: SLOW_BUILD_MULTIPLIER,
                      }
                    : {scheduled: false},
            },
        });
    }

    if (shouldReset) {
        queueMicrotask(() => {
            try {
                resetAudioFeedState('slow_build');
            } catch {
                // ignore
            }
        });
    }
}

const cache = createFeedCache({
    feedKey: 'audio',
    diskFileName: 'audiofeed.xml',
    fallback: {title: 'M10Z Podcasts', selfPath: '/audiofeed.xml'},
    build: buildAudioFeed,
    onBuildSuccess: recordAudioBuildHealth,
});

function resetAudioFeedState(reason: 'slow_build' | 'manual') {
    initialBuildDurationMs = null;
    buildDurationsMs.splice(0, buildDurationsMs.length);
    lastBuildTiming = null;

    recordDiagnosticEvent({
        ts: Date.now(),
        kind: 'route',
        name: 'feed.audio.reset',
        ok: true,
        durationMs: 0,
        detail: {reason},
    });

    cache.reset();
}

export function resetAudioFeedStateForDiagnostics(reason: 'manual' = 'manual') {
    resetAudioFeedState(reason);
}

export const buildAudioFeedResponse = cache.handle;
export const scheduleDebouncedRefresh = cache.scheduleDebouncedRefresh;
export const stopScheduler = cache.stopScheduler;
export const getSchedulerState = cache.getSchedulerState;

export function getAudioFeedRuntimeState() {
    const state = cache.getSchedulerState();
    const now = Date.now();
    const uptimeMs = state.schedulerStartedAtMs ? now - state.schedulerStartedAtMs : 0;
    const last3 = buildDurationsMs.slice(-SLOW_BUILD_WINDOW);
    const hasEnough = last3.length === SLOW_BUILD_WINDOW && initialBuildDurationMs !== null;
    const thresholdMs = initialBuildDurationMs ? initialBuildDurationMs * SLOW_BUILD_MULTIPLIER : null;
    const wouldTrigger =
        hasEnough && thresholdMs !== null ? last3.every((d) => d > thresholdMs) : false;

    const trend =
        buildDurationsMs.length >= 5
            ? (() => {
                  const first = buildDurationsMs[0] ?? 0;
                  const last = buildDurationsMs[buildDurationsMs.length - 1] ?? 0;
                  if (first <= 0) return 'unknown';
                  const ratio = last / first;
                  if (ratio >= 1.25) return 'increasing';
                  if (ratio <= 0.85) return 'decreasing';
                  return 'stable';
              })()
            : 'unknown';

    return {
        schedulerStarted: state.schedulerStarted,
        hasTimer: state.hasTimer,
        schedulerStartedAtMs: state.schedulerStartedAtMs,
        uptimeMs,
        initialBuildDurationMs,
        buildCount: buildDurationsMs.length,
        recentBuildDurationsMs: buildDurationsMs.slice(),
        trend,
        threshold: {
            window: SLOW_BUILD_WINDOW,
            multiplier: SLOW_BUILD_MULTIPLIER,
            thresholdMs,
            wouldTrigger,
        },
        lastBuildTiming,
    };
}

if (typeof module !== 'undefined' && module.hot) {
    module.hot.dispose(() => {
        cache.stopScheduler();
    });
}
