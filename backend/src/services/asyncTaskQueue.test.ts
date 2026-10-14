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

    test('a throwing onSettled does not drop the items after its sub-batch', async () => {
        const run = vi.fn().mockResolvedValue(true);
        const onSettled = vi.fn((item: string) => {
            if (item === 'a') throw new Error('callback boom');
        });
        const queue = new AsyncTaskQueue<string>({
            name: 'test',
            keyOf: (item) => item,
            run,
            onSettled,
            debounceMs: 100,
        });

        // More than one sub-batch (DEFAULT_CONCURRENCY = 5) with the throwing callback in
        // the first one: the items are removed from `pending` before the callbacks run, so
        // an escaping exception used to skip every later sub-batch.
        for (const item of ['a', 'b', 'c', 'd', 'e', 'f']) queue.enqueue(item, strapi);
        await vi.advanceTimersByTimeAsync(100);

        expect(run).toHaveBeenCalledTimes(6);
        expect(onSettled).toHaveBeenCalledTimes(6);
        expect(strapi.log.warn).toHaveBeenCalledWith(
            expect.stringContaining('onSettled threw'),
            expect.any(Error),
        );
    });

    test('a throwing onAbandoned does not escape the batch', async () => {
        const run = vi.fn().mockResolvedValue(false);
        const onAbandoned = vi.fn(() => {
            throw new Error('abandon boom');
        });
        const queue = new AsyncTaskQueue<string>({
            name: 'test',
            keyOf: (item) => item,
            run,
            onAbandoned,
            maxFailureRetries: 1,
            debounceMs: 100,
        });

        queue.enqueue('a', strapi);
        await expect(vi.advanceTimersByTimeAsync(100)).resolves.not.toThrow();

        expect(onAbandoned).toHaveBeenCalledTimes(1);
        expect(strapi.log.warn).toHaveBeenCalledWith(
            expect.stringContaining('onAbandoned threw'),
            expect.any(Error),
        );
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
});
