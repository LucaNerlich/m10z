import {describe, expect, test, vi} from 'vitest';

import {createFeedCache, type FeedBuilt} from './feedCache';

function deps() {
    return {
        feedCacheDir: '/tmp/feed-cache-reset-race',
        now: () => 1_700_000_000_000,
        // Do not fire the interval: the reset's own `ensureScheduler()` already
        // kicks a background refresh, which is what the race is about.
        setIntervalFn: (() => 1) as unknown as typeof setInterval,
        clearIntervalFn: vi.fn(),
        setTimeoutFn: (() => 1) as unknown as typeof setTimeout,
        clearTimeoutFn: vi.fn(),
        fs: {
            mkdir: vi.fn(async () => undefined),
            writeFile: vi.fn(async () => undefined),
            readFile: vi.fn(async () => {
                throw new Error('missing');
            }),
            rename: vi.fn(async () => undefined),
        },
    };
}

function specWith(build: () => Promise<FeedBuilt>) {
    return {
        feedKey: 'test',
        diskFileName: 'reset-race.xml',
        fallback: {title: 'Test', selfPath: '/reset-race.xml'},
        build,
    };
}

describe('createFeedCache reset()', () => {
    test('does not start a second concurrent build when called mid-build', async () => {
        const resolvers: Array<(value: FeedBuilt) => void> = [];
        const build = vi.fn(
            () =>
                new Promise<FeedBuilt>((resolve) => {
                    resolvers.push(resolve);
                }),
        );

        const cache = createFeedCache(specWith(build), deps());

        const first = cache.refresh();
        expect(build).toHaveBeenCalledTimes(1);

        // The slow-build health reset fires while build #1 is still running.
        cache.reset();

        // Before the fix, `reset()` cleared `inflight`, so its immediate
        // `refreshInBackground()` started build #2 right here.
        expect(build).toHaveBeenCalledTimes(1);

        resolvers[0]!({xml: '<rss/>', etag: '"a"', lastModified: null, itemCount: 1});
        await first;

        // The queued follow-up runs only after the in-flight build settled.
        await vi.waitFor(() => expect(build).toHaveBeenCalledTimes(2));
        resolvers[1]?.({xml: '<rss/>', etag: '"b"', lastModified: null, itemCount: 1});
    });

    test('still forces a fresh build when nothing is in flight', async () => {
        let counter = 0;
        const build = vi.fn(async () => ({
            xml: `<rss>${++counter}</rss>`,
            etag: `"${counter}"`,
            lastModified: null,
            itemCount: 1,
        }));

        const cache = createFeedCache(specWith(build), deps());

        const before = await cache.refresh();
        expect(before.xml).toBe('<rss>1</rss>');

        cache.reset();

        const after = await cache.refresh();
        expect(after.xml).toBe('<rss>2</rss>');
    });
});
