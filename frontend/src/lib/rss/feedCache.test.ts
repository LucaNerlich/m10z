import {describe, expect, test, vi} from 'vitest';

import {createFeedCache, type FeedBuilt} from './feedCache';

describe('createFeedCache', () => {
    test('refresh builds and caches feed from spec.build', async () => {
        const built: FeedBuilt = {
            xml: '<rss/>',
            etag: '"abc"',
            lastModified: new Date('2024-01-01'),
            itemCount: 3,
        };
        const build = vi.fn(async () => built);

        const cache = createFeedCache(
            {
                feedKey: 'test',
                diskFileName: 'test.xml',
                fallback: {title: 'Test', selfPath: '/test.xml'},
                build,
            },
            {
                feedCacheDir: '/tmp/feed-cache-test',
                now: () => 1_700_000_000_000,
                setIntervalFn: ((fn: () => void) => {
                    fn();
                    return 1 as unknown as ReturnType<typeof setInterval>;
                }) as typeof setInterval,
                clearIntervalFn: vi.fn(),
                setTimeoutFn: ((fn: () => void) => {
                    fn();
                    return 1 as unknown as ReturnType<typeof setTimeout>;
                }) as typeof setTimeout,
                clearTimeoutFn: vi.fn(),
                fs: {
                    mkdir: vi.fn(async () => undefined),
                    writeFile: vi.fn(async () => undefined),
                    readFile: vi.fn(async () => {
                        throw new Error('missing');
                    }),
                    rename: vi.fn(async () => undefined),
                },
            },
        );

        const result = await cache.refresh();
        expect(build).toHaveBeenCalledOnce();
        expect(result.xml).toBe('<rss/>');
        expect(result.etag).toBe('"abc"');
        expect(result.itemCount).toBe(3);
    });

    test('handle returns 429 when rate limited', async () => {
        const cache = createFeedCache(
            {
                feedKey: 'test',
                diskFileName: 'test429.xml',
                fallback: {title: 'Test', selfPath: '/test.xml'},
                build: async () => ({
                    xml: '<rss/>',
                    etag: '"x"',
                    lastModified: null,
                    itemCount: 0,
                }),
            },
            {
                feedCacheDir: '/tmp/feed-cache-429',
                checkRateLimitFn: () => ({ok: false, retryAfterSeconds: 30}),
                getClientIpFn: () => '127.0.0.1',
                fs: {
                    mkdir: vi.fn(async () => undefined),
                    writeFile: vi.fn(async () => undefined),
                    readFile: vi.fn(async () => {
                        throw new Error('missing');
                    }),
                    rename: vi.fn(async () => undefined),
                },
            },
        );

        const response = await cache.handle(new Request('http://localhost/test.xml'));
        expect(response.status).toBe(429);
        expect(response.headers.get('Retry-After')).toBe('30');
        // Body-less: an empty-but-valid RSS body would make podcatchers treat
        // the feed as emptied.
        expect(await response.text()).toBe('');
    });

    test('runs a follow-up build when an invalidation lands during an in-flight build', async () => {
        const built1: FeedBuilt = {xml: '<rss><v>1</v></rss>', etag: '"1"', lastModified: null, itemCount: 1};
        const built2: FeedBuilt = {xml: '<rss><v>2</v></rss>', etag: '"2"', lastModified: null, itemCount: 2};
        const resolvers: {resolveBuild?: (built: FeedBuilt) => void; debounceCb?: () => void} = {};
        const build = vi.fn(
            () =>
                new Promise<FeedBuilt>((resolve) => {
                    resolvers.resolveBuild = resolve;
                }),
        );

        const cache = createFeedCache(
            {
                feedKey: 'test',
                diskFileName: 'test-pending.xml',
                fallback: {title: 'Test', selfPath: '/test.xml'},
                build,
            },
            {
                feedCacheDir: '/tmp/feed-cache-pending',
                setTimeoutFn: ((fn: () => void) => {
                    resolvers.debounceCb = fn;
                    return 1 as unknown as ReturnType<typeof setTimeout>;
                }) as typeof setTimeout,
                clearTimeoutFn: vi.fn(),
                fs: {
                    mkdir: vi.fn(async () => undefined),
                    writeFile: vi.fn(async () => undefined),
                    readFile: vi.fn(async () => {
                        throw new Error('missing');
                    }),
                    rename: vi.fn(async () => undefined),
                },
            },
        );

        const first = cache.refresh();
        expect(build).toHaveBeenCalledTimes(1);

        // Invalidation debounce fires while the first build is still running.
        cache.scheduleDebouncedRefresh();
        resolvers.debounceCb?.();
        resolvers.resolveBuild?.(built1);
        await first;

        // The skipped refresh is re-run once the in-flight build settles.
        expect(build).toHaveBeenCalledTimes(2);
        resolvers.resolveBuild?.(built2);
        expect(await cache.refresh()).toMatchObject({itemCount: 2});
    });
});
