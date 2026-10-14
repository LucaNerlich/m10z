/**
 * Generic debounced, single-flight, backoff-with-dead-letter task queue.
 *
 * Replaces the two near-identical bespoke queues that used to exist
 * (`asyncCacheInvalidationQueue.ts`, `asyncSearchIndexQueue.ts`) — the cache-invalidation
 * queue had no failure cutoff (would retry forever against a persistently-down frontend),
 * the search-index queue did. Both now share this one policy.
 */

export type StrapiLike = {
    log: {
        info: (message: string) => void;
        warn: (message: string, error?: unknown) => void;
    };
};

export type TaskQueueOptions<T, S extends StrapiLike = StrapiLike> = {
    /** Human-readable name used in log messages. */
    name: string;
    /** Stable dedupe key for an item — re-enqueuing the same key coalesces into one pending item. */
    keyOf: (item: T) => string;
    /** Perform the task; return true on success, false on failure (never throw). */
    run: (item: T, strapi: S) => Promise<boolean>;
    /**
     * Combine an already-pending item with a newly-enqueued one sharing the same key,
     * so per-item bookkeeping (e.g. accumulated durable-storage ids) isn't dropped when
     * dedup coalesces them. Defaults to keeping only the incoming item.
     */
    merge?: (existing: T, incoming: T) => T;
    /** Base debounce window in ms before a batch runs. */
    debounceMs?: number;
    /** Consecutive failed batches after which pending items for that key are abandoned. */
    maxFailureRetries?: number;
    /** Called once per item after each run attempt (e.g. to remove it from durable storage on success). */
    onSettled?: (item: T, succeeded: boolean, strapi: S) => void;
    /** Called once per batch with the abandoned items when the retry limit is hit (e.g. to drop their durable-storage rows). */
    onAbandoned?: (items: T[], strapi: S) => void;
};

const DEFAULT_DEBOUNCE_MS = 5000;
/** Items processed concurrently within a run; no caller needs a different value. */
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_MAX_FAILURE_RETRIES = 5;
const MAX_BACKOFF_MS = 60_000;

export class AsyncTaskQueue<T, S extends StrapiLike = StrapiLike> {
    private pending = new Map<string, T>();
    private isRunning = false;
    private consecutiveFailures = 0;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(private readonly options: TaskQueueOptions<T, S>) {}

    /**
     * Invoke a caller callback without letting it abort the batch.
     *
     * The batch's items are removed from `pending` before these callbacks run, so an
     * exception escaping one of them would skip every remaining item in the run (and
     * surface as an unhandled rejection). Contain it here, per item / per batch.
     */
    private notifySettled(item: T, succeeded: boolean, strapi: S): void {
        try {
            this.options.onSettled?.(item, succeeded, strapi);
        } catch (error: unknown) {
            strapi.log.warn(`[${this.options.name}] onSettled threw; continuing with the batch.`, error);
        }
    }

    private notifyAbandoned(items: T[], strapi: S): void {
        try {
            this.options.onAbandoned?.(items, strapi);
        } catch (error: unknown) {
            strapi.log.warn(`[${this.options.name}] onAbandoned threw; continuing.`, error);
        }
    }

    enqueue(item: T, strapi: S | undefined | null): void {
        if (!strapi) {
            console.warn(`[${this.options.name}] Missing strapi instance; cannot enqueue.`);
            return;
        }

        this.setPending(item);
        strapi.log.info(
            `[${this.options.name}] queued (debounced ${(this.options.debounceMs ?? DEFAULT_DEBOUNCE_MS) / 1000}s), ${this.pending.size} pending.`,
        );
        this.scheduleRun(strapi);
    }

    /** Re-enqueue items recovered from durable storage on boot, without re-triggering onEnqueue persistence. */
    restore(items: T[], strapi: S): void {
        if (items.length === 0) return;
        for (const item of items) {
            this.setPending(item);
        }
        strapi.log.info(`[${this.options.name}] restored ${items.length} pending item(s) from durable storage.`);
        this.scheduleRun(strapi);
    }

    /** Set a pending item, merging with any existing item sharing the same key. */
    private setPending(item: T): void {
        const key = this.options.keyOf(item);
        const existing = this.pending.get(key);
        const value = existing && this.options.merge ? this.options.merge(existing, item) : item;
        this.pending.set(key, value);
    }

    private clearTimer(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }

    private scheduleRun(strapi: S): void {
        this.clearTimer();
        const base = this.options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
        const delay =
            this.consecutiveFailures > 0
                ? Math.min(base * Math.pow(2, this.consecutiveFailures), MAX_BACKOFF_MS)
                : base;

        this.debounceTimer = setTimeout(() => {
            this.debounceTimer = null;
            if (this.isRunning) return;
            void this.runBatch(strapi);
        }, delay);
    }

    private async runBatch(strapi: S): Promise<void> {
        if (this.isRunning || this.pending.size === 0) return;

        this.isRunning = true;
        const items = Array.from(this.pending.values());
        this.pending.clear();
        strapi.log.info(`[${this.options.name}] running ${items.length} item(s).`);

        const failedItems: T[] = [];
        let succeededCount = 0;
        try {
            for (let i = 0; i < items.length; i += DEFAULT_CONCURRENCY) {
                const batch = items.slice(i, i + DEFAULT_CONCURRENCY);
                await Promise.all(
                    batch.map(async (item) => {
                        const succeeded = await this.options.run(item, strapi).catch((error: unknown) => {
                            strapi.log.warn(`[${this.options.name}] task threw for an item; treating as failure.`, error);
                            return false;
                        });
                        this.notifySettled(item, succeeded, strapi);
                        if (succeeded) {
                            succeededCount++;
                        } else {
                            failedItems.push(item);
                        }
                    }),
                );
            }
        } finally {
            this.isRunning = false;

            if (failedItems.length === 0) {
                this.consecutiveFailures = 0;
                strapi.log.info(`[${this.options.name}] completed: ${succeededCount} succeeded.`);
            } else {
                this.consecutiveFailures++;
                strapi.log.warn(
                    `[${this.options.name}] completed: ${succeededCount} succeeded, ${failedItems.length} failed.`,
                );

                const maxRetries = this.options.maxFailureRetries ?? DEFAULT_MAX_FAILURE_RETRIES;
                if (this.consecutiveFailures >= maxRetries) {
                    strapi.log.warn(
                        `[${this.options.name}] abandoning ${failedItems.length} item(s) after ${maxRetries} consecutive failed batches; will retry on next enqueue.`,
                    );
                    this.notifyAbandoned(failedItems, strapi);
                    this.consecutiveFailures = 0;
                } else {
                    // Re-queue failed items for the next (backed-off) run, merging into any
                    // newer enqueue of the same key rather than silently dropping either side.
                    for (const item of failedItems) {
                        const key = this.options.keyOf(item);
                        const existing = this.pending.get(key);
                        if (existing !== undefined && this.options.merge) {
                            this.pending.set(key, this.options.merge(item, existing));
                        } else {
                            this.pending.set(key, item);
                        }
                    }
                }
            }

            if (this.pending.size > 0) {
                this.scheduleRun(strapi);
            }
        }
    }
}
