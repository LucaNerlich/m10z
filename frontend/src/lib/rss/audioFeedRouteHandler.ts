import qs from 'qs';

import {CACHE_REVALIDATE_DEFAULT} from '@/src/lib/cache/constants';
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
import {fetchStrapiJson as fetchStrapiJsonCore} from '@/src/lib/rss/feedRoute';
import {markdownToHtml} from '@/src/lib/rss/markdownToHtml';
import {sha256Hex} from '@/src/lib/rss/xml';
import {MEDIA_FIELDS, populateAuthorAvatar, populateCategory} from '@/src/lib/strapiContent';

const SITE_URL = (process.env.NEXT_PUBLIC_DOMAIN ?? 'https://m10z.de').replace(/\/+$/, '');
const STRAPI_URL = (process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? '').replace(
    /\/+$/,
    '',
);
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

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

async function fetchStrapiJson<T>(pathWithQuery: string): Promise<T> {
    if (!STRAPI_URL) throw new Error('Missing NEXT_PUBLIC_STRAPI_URL');
    const revalidate = process.env.NODE_ENV === 'production' ? CACHE_REVALIDATE_DEFAULT : 0;
    return await fetchStrapiJsonCore<T>({
        strapiBaseUrl: STRAPI_URL,
        apiPathWithQuery: pathWithQuery,
        token: STRAPI_TOKEN,
        tags: ['feed:audio', 'strapi:podcast', 'strapi:audio-feed'],
        revalidate,
        timeoutMs: 30_000,
    });
}

async function fetchPodcastPage(
    page: number,
    pageSize: number,
): Promise<{
    data: unknown[];
    meta?: {pagination?: {page: number; pageCount: number; total: number}};
}> {
    const query = qs.stringify(
        {
            sort: ['publishedAt:desc'],
            status: 'published',
            pagination: {pageSize, page},
            populate: {
                cover: {fields: MEDIA_FIELDS},
                banner: {fields: MEDIA_FIELDS},
                authors: populateAuthorAvatar,
                categories: populateCategory,
                file: {populate: '*'},
            },
            fields: [
                'slug',
                'duration',
                'shownotes',
                'wordCount',
                'publishedAt',
                'title',
                'description',
                'date',
            ],
        },
        {encodeValuesOnly: true},
    );
    return fetchStrapiJson(`/api/podcasts?${query}`);
}

async function fetchAllPodcasts(): Promise<StrapiPodcast[]> {
    const maxPages = 50;
    const maxItems = Number(process.env.FEED_AUDIO_MAX_ITEMS ?? '') || 1000;
    const pageSize = 100;

    const firstRes = await fetchPodcastPage(1, pageSize);
    const firstItems = Array.isArray(firstRes.data) ? (firstRes.data as StrapiPodcast[]) : [];
    const all: StrapiPodcast[] = firstItems.slice(0, maxItems);

    const pagination = firstRes.meta?.pagination;
    if (
        !pagination ||
        pagination.pageCount <= 1 ||
        firstItems.length === 0 ||
        all.length >= maxItems
    ) {
        return all;
    }

    const lastPage = Math.min(pagination.pageCount, maxPages);
    const pageNumbers = Array.from({length: lastPage - 1}, (_, i) => i + 2);
    const results = await Promise.all(pageNumbers.map((p) => fetchPodcastPage(p, pageSize)));

    for (const res of results) {
        const items = Array.isArray(res.data) ? (res.data as StrapiPodcast[]) : [];
        const remaining = Math.max(0, maxItems - all.length);
        if (remaining <= 0) break;
        all.push(...items.slice(0, remaining));
    }

    return all;
}

async function fetchAudioFeedSingle(): Promise<StrapiAudioFeedSingle> {
    const query = qs.stringify(
        {
            populate: {
                channel: {
                    populate: {image: {fields: MEDIA_FIELDS}},
                },
            },
        },
        {encodeValuesOnly: true},
    );
    const res = await fetchStrapiJson<{data: StrapiAudioFeedSingle}>(`/api/audio-feed?${query}`);
    return res.data;
}

function getAudioFeedDefaults(): AudioFeedConfig {
    return {
        siteUrl: SITE_URL,
        ttlSeconds: 60,
        language: 'de',
        copyright: 'All rights reserved',
        webMaster: 'm10z@posteo.de',
        authorEmail: 'm10z@posteo.de',
        itunesAuthor: 'M10Z',
        itunesExplicit: 'false',
        itunesType: 'episodic',
        podcastGuid: 'E9QfcR8TYeotS5ceJLmn',
    };
}

async function buildAudioFeed(): Promise<FeedBuilt> {
    const [feed, episodes] = await Promise.all([fetchAudioFeedSingle(), fetchAllPodcasts()]);
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

    const etag = `"${sha256Hex(`${etagSeed}:${sha256Hex(xml)}`)}"`;

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
