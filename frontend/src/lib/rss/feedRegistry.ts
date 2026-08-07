import {createAudioFeedBuildHealth, resetAudioFeedBuildHealthForDiagnostics} from '@/src/lib/rss/audioFeedBuildHealth';
import {buildArticleFeed} from '@/src/lib/rss/buildArticleFeed';
import {type AudioFeedBuildTiming, buildAudioFeed} from '@/src/lib/rss/buildAudioFeed';
import {createFeedCache, type FeedCache} from '@/src/lib/rss/feedCache';

import {type ContentTypeKey} from '@/src/lib/shared/strapiContract';

// `module.hot` is injected by the dev bundler for HMR; not present in production/runtime node.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

type FeedRegistry = {
    article: FeedCache;
    audio: FeedCache;
    onInvalidate: (type: ContentTypeKey) => void;
    disposeHmr: () => void;
    resetAudioFeedStateForDiagnostics: (reason?: 'manual') => void;
    getAudioFeedRuntimeState: () => ReturnType<ReturnType<typeof createAudioFeedBuildHealth>['getRuntimeState']>;
};

function createRegistry(): FeedRegistry {
    const article = createFeedCache({
        feedKey: 'article',
        diskFileName: 'rss.xml',
        fallback: {title: 'M10Z Artikel', selfPath: '/rss.xml'},
        build: buildArticleFeed,
    });

    let lastAudioBuildTiming: AudioFeedBuildTiming | null = null;
    const audioBuildHealth = createAudioFeedBuildHealth(() => {
        resetAudioFeedBuildHealthForDiagnostics(audioBuildHealth, () => audio.reset(), 'slow_build');
    });

    const audio = createFeedCache({
        feedKey: 'audio',
        diskFileName: 'audiofeed.xml',
        fallback: {title: 'M10Z Podcasts', selfPath: '/audiofeed.xml'},
        build: async () => {
            const {built, buildTiming} = await buildAudioFeed();
            lastAudioBuildTiming = buildTiming;
            return built;
        },
        onBuildSuccess: (info) => {
            audioBuildHealth.recordBuild({...info, lastBuildTiming: lastAudioBuildTiming ?? undefined});
        },
    });

    return {
        article,
        audio,
        onInvalidate(type: ContentTypeKey) {
            if (type === 'article' || type === 'article-feed') {
                article.scheduleDebouncedRefresh();
            } else if (type === 'podcast' || type === 'audio-feed') {
                audio.scheduleDebouncedRefresh();
            }
        },
        disposeHmr() {
            article.stopScheduler();
            audio.stopScheduler();
        },
        resetAudioFeedStateForDiagnostics(reason: 'manual' = 'manual') {
            resetAudioFeedBuildHealthForDiagnostics(audioBuildHealth, () => audio.reset(), reason);
        },
        getAudioFeedRuntimeState() {
            return audioBuildHealth.getRuntimeState(audio.getSchedulerState());
        },
    };
}

export const feedRegistry = createRegistry();

if (typeof module !== 'undefined' && module.hot) {
    module.hot.dispose(() => {
        feedRegistry.disposeHmr();
    });
}
