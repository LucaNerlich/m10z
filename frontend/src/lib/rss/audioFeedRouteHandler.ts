import {
    createAudioFeedBuildHealth,
    resetAudioFeedBuildHealthForDiagnostics,
} from '@/src/lib/rss/audioFeedBuildHealth';
import {buildAudioFeed, type AudioFeedBuildTiming} from '@/src/lib/rss/buildAudioFeed';
import {type FeedCache, createFeedCache} from '@/src/lib/rss/feedCache';

// `module.hot` is injected by the dev bundler for HMR; not present in production/runtime node.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

let lastBuildTiming: AudioFeedBuildTiming | null = null;
let cache: FeedCache;

const buildHealth = createAudioFeedBuildHealth(() => {
    resetAudioFeedBuildHealthForDiagnostics(buildHealth, () => cache.reset(), 'slow_build');
});

cache = createFeedCache({
    feedKey: 'audio',
    diskFileName: 'audiofeed.xml',
    fallback: {title: 'M10Z Podcasts', selfPath: '/audiofeed.xml'},
    build: async () => {
        const {built, buildTiming} = await buildAudioFeed();
        lastBuildTiming = buildTiming;
        return built;
    },
    onBuildSuccess: (info) => {
        buildHealth.recordBuild({...info, lastBuildTiming: lastBuildTiming ?? undefined});
    },
});

export function resetAudioFeedStateForDiagnostics(reason: 'manual' = 'manual') {
    resetAudioFeedBuildHealthForDiagnostics(buildHealth, () => cache.reset(), reason);
}

export const buildAudioFeedResponse = cache.handle;
export const scheduleDebouncedRefresh = cache.scheduleDebouncedRefresh;
export const stopScheduler = cache.stopScheduler;
export const getSchedulerState = cache.getSchedulerState;

export function getAudioFeedRuntimeState() {
    return buildHealth.getRuntimeState(cache.getSchedulerState());
}

if (typeof module !== 'undefined' && module.hot) {
    module.hot.dispose(() => {
        cache.stopScheduler();
    });
}
