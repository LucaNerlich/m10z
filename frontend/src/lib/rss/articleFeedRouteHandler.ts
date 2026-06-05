import {createFeedCache} from '@/src/lib/rss/feedCache';
import {buildArticleFeed} from '@/src/lib/rss/buildArticleFeed';

// `module.hot` is injected by the dev bundler for HMR; not present in production/runtime node.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

const cache = createFeedCache({
    feedKey: 'article',
    diskFileName: 'rss.xml',
    fallback: {title: 'M10Z Artikel', selfPath: '/rss.xml'},
    build: buildArticleFeed,
});

export const buildArticleFeedResponse = cache.handle;
export const scheduleDebouncedRefresh = cache.scheduleDebouncedRefresh;
export const stopScheduler = cache.stopScheduler;
export const getSchedulerState = cache.getSchedulerState;

if (typeof module !== 'undefined' && module.hot) {
    module.hot.dispose(() => {
        cache.stopScheduler();
    });
}
