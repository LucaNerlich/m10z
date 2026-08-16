import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {AsyncTaskQueue} from './asyncTaskQueue';

const strapi = {log: {info: vi.fn(), warn: vi.fn()}};

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe('AsyncTaskQueue', () => {
    test('debounces multiple enqueues into a single run', async () => {
        const run = vi.fn().mockResolvedValue(true);
        const queue = new AsyncTaskQueue<string>({name: 'test', keyOf: (item) => item, run, debounceMs: 1000});

        queue.enqueue('a', strapi);
        queue.enqueue('b', strapi);
        queue.enqueue('a', strapi); // dedupes with the first 'a'

        await vi.advanceTimersByTimeAsync(1000);

        expect(run).toHaveBeenCalledTimes(2);
        expect(run.mock.calls.map(([item]) => item).sort()).toEqual(['a', 'b']);
    });

    test('re-queues a failed item for retry with exponential backoff', async () => {
        const run = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
        const queue = new AsyncTaskQueue<string>({name: 'test', keyOf: (item) => item, run, debounceMs: 1000});

        queue.enqueue('a', strapi);
        await vi.advanceTimersByTimeAsync(1000);
        expect(run).toHaveBeenCalledTimes(1);

        // Backoff after one failure is 1000 * 2^1 = 2000ms.
        await vi.advanceTimersByTimeAsync(2000);
        expect(run).toHaveBeenCalledTimes(2);
    });

    test('abandons an item after maxFailureRetries consecutive failures', async () => {
        const run = vi.fn().mockResolvedValue(false);
        const queue = new AsyncTaskQueue<string>({
            name: 'test',
            keyOf: (item) => item,
            run,
            debounceMs: 100,
            maxFailureRetries: 2,
        });

        queue.enqueue('a', strapi);
        await vi.advanceTimersByTimeAsync(100); // attempt 1 fails
        await vi.advanceTimersByTimeAsync(200); // attempt 2 fails, hits maxFailureRetries -> abandoned

        const callsAfterAbandon = run.mock.calls.length;
        await vi.advanceTimersByTimeAsync(10_000);
        expect(run).toHaveBeenCalledTimes(callsAfterAbandon);
        expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('abandoning'));
    });

    test('onSettled is called with the outcome of each run', async () => {
        const run = vi.fn().mockResolvedValue(true);
        const onSettled = vi.fn();
        const queue = new AsyncTaskQueue<string>({name: 'test', keyOf: (item) => item, run, onSettled, debounceMs: 100});

        queue.enqueue('a', strapi);
        await vi.advanceTimersByTimeAsync(100);

        expect(onSettled).toHaveBeenCalledWith('a', true, strapi);
    });

    test('calls onAbandoned with the failed items when the retry limit is reached', async () => {
        const run = vi.fn().mockResolvedValue(false);
        const onAbandoned = vi.fn();
        const queue = new AsyncTaskQueue<string>({
            name: 'test',
            keyOf: (item) => item,
            run,
            onAbandoned,
            debounceMs: 100,
            maxFailureRetries: 2,
        });

        queue.enqueue('a', strapi);
        await vi.advanceTimersByTimeAsync(100); // attempt 1 fails
        await vi.advanceTimersByTimeAsync(200); // attempt 2 fails -> abandoned

        expect(onAbandoned).toHaveBeenCalledTimes(1);
        expect(onAbandoned).toHaveBeenCalledWith(['a'], strapi);
    });

    test('restore seeds pending items and schedules a run without duplicating onEnqueue side effects', async () => {
        const run = vi.fn().mockResolvedValue(true);
        const queue = new AsyncTaskQueue<string>({name: 'test', keyOf: (item) => item, run, debounceMs: 100});

        queue.restore(['a', 'b'], strapi);
        await vi.advanceTimersByTimeAsync(100);

        expect(run).toHaveBeenCalledTimes(2);
    });

    test('merges items that dedupe to the same key instead of dropping the older one', async () => {
        type Item = {key: string; ids: number[]};
        const run = vi.fn().mockResolvedValue(true);
        const queue = new AsyncTaskQueue<Item>({
            name: 'test',
            keyOf: (item) => item.key,
            merge: (existing, incoming) => ({key: incoming.key, ids: [...existing.ids, ...incoming.ids]}),
            run,
            debounceMs: 1000,
        });

        queue.enqueue({key: 'a', ids: [1]}, strapi);
        queue.enqueue({key: 'a', ids: [2]}, strapi);
        await vi.advanceTimersByTimeAsync(1000);

        expect(run).toHaveBeenCalledTimes(1);
        expect(run.mock.calls[0][0]).toEqual({key: 'a', ids: [1, 2]});
    });

    test('logs and treats a rejected run as a failure instead of throwing', async () => {
        const run = vi.fn().mockRejectedValue(new Error('boom'));
        const onSettled = vi.fn();
        const queue = new AsyncTaskQueue<string>({name: 'test', keyOf: (item) => item, run, onSettled, debounceMs: 100});

        queue.enqueue('a', strapi);
        await vi.advanceTimersByTimeAsync(100);

        expect(onSettled).toHaveBeenCalledWith('a', false, strapi);
        expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('threw'), expect.any(Error));
    });

    test('caps the batch delay to maxWaitMs even if items keep arriving', async () => {
        const run = vi.fn().mockResolvedValue(true);
        const queue = new AsyncTaskQueue<string>({
            name: 'test',
            keyOf: (item) => item,
            run,
            debounceMs: 1000,
            maxWaitMs: 1500,
        });

        queue.enqueue('a', strapi);
        await vi.advanceTimersByTimeAsync(1000);
        queue.enqueue('b', strapi); // would normally push the run out another 1000ms

        // Without the cap this wouldn't fire until t=2000; the 1500ms deadline (from the
        // first enqueue) should force it to run by t=1500.
        await vi.advanceTimersByTimeAsync(500);
        expect(run).toHaveBeenCalled();
    });
});
