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

    test('restore seeds pending items and schedules a run without duplicating onEnqueue side effects', async () => {
        const run = vi.fn().mockResolvedValue(true);
        const queue = new AsyncTaskQueue<string>({name: 'test', keyOf: (item) => item, run, debounceMs: 100});

        queue.restore(['a', 'b'], strapi);
        await vi.advanceTimersByTimeAsync(100);

        expect(run).toHaveBeenCalledTimes(2);
    });
});
