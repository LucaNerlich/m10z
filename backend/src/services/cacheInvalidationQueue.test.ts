import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
    postInvalidationEvent: vi.fn(),
    persistPending: vi.fn(),
    removePending: vi.fn(),
    drainPending: vi.fn(),
}));

vi.mock('../utils/invalidateNextCache', () => ({postInvalidationEvent: mocks.postInvalidationEvent}));
vi.mock('./pendingInvalidationStore', () => ({
    persistPending: mocks.persistPending,
    removePending: mocks.removePending,
    drainPending: mocks.drainPending,
}));

const strapi = {log: {info: vi.fn(), warn: vi.fn()}};

beforeEach(() => {
    vi.useFakeTimers();
    // The queue is module-level state; a fresh module keeps the tests isolated.
    vi.resetModules();
    mocks.postInvalidationEvent.mockReset();
    mocks.persistPending.mockReset().mockResolvedValue(1);
    mocks.removePending.mockReset();
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

async function enqueueOne(): Promise<void> {
    const {queueCacheInvalidation} = await import('./cacheInvalidationQueue');
    queueCacheInvalidation({type: 'article', action: 'publish', slug: 'a'}, strapi as never);
    // Let the persist promise resolve so the item is enqueued.
    await vi.advanceTimersByTimeAsync(0);
}

describe('cacheInvalidationQueue', () => {
    test('keeps retrying an outage instead of dead-lettering the event', async () => {
        mocks.postInvalidationEvent.mockResolvedValue(false);
        await enqueueOne();

        // Six backoff windows: the queue must still be retrying, and nothing may
        // delete the durable row (an abandoned event is never re-read before boot).
        for (let i = 0; i < 6; i++) {
            await vi.advanceTimersByTimeAsync(60_000);
        }

        expect(mocks.postInvalidationEvent.mock.calls.length).toBeGreaterThanOrEqual(6);
        expect(mocks.removePending).not.toHaveBeenCalled();
    });

    test('removes the durable row once the event is delivered', async () => {
        mocks.postInvalidationEvent.mockResolvedValue(true);
        await enqueueOne();
        await vi.advanceTimersByTimeAsync(6000);

        expect(mocks.postInvalidationEvent).toHaveBeenCalledTimes(1);
        expect(mocks.removePending).toHaveBeenCalledWith(strapi, 1);
    });
});
