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

export type TaskQueueOptions<T> = {
    /** Human-readable name used in log messages. */
    name: string;
    /** Stable dedupe key for an item — re-enqueuing the same key coalesces into one pending item. */
    keyOf: (item: T) => string;
    /** Perform the task; return true on success, false on failure (never throw). */
    run: (item: T, strapi: StrapiLike) => Promise<boolean>;
    /** Base debounce window in ms before a batch runs. */
    debounceMs?: number;
    /** How many items to process concurrently within a batch. */
    concurrency?: number;
    /** Consecutive failed batches after which pending items for that key are abandoned. */
    maxFailureRetries?: number;
    /** Called once per item after each run attempt (e.g. to remove it from durable storage on success). */
    onSettled?: (item: T, succeeded: boolean, strapi: StrapiLike) => void;
};

const DEFAULT_DEBOUNCE_MS = 5000;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_MAX_FAILURE_RETRIES = 5;
const MAX_BACKOFF_MS = 60_000;

export class AsyncTaskQueue<T> {
    private pending = new Map<string, T>();
    private isRunning = false;
    private consecutiveFailures = 0;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(private readonly options: TaskQueueOptions<T>) {}

    enqueue(item: T, strapi: StrapiLike | undefined | null): void {
        if (!strapi) {
            console.warn(`[${this.options.name}] Missing strapi instance; cannot enqueue.`);
            return;
        }

        this.pending.set(this.options.keyOf(item), item);
        strapi.log.info(
            `[${this.options.name}] queued (debounced ${(this.options.debounceMs ?? DEFAULT_DEBOUNCE_MS) / 1000}s), ${this.pending.size} pending.`,
        );
        this.scheduleRun(strapi);
    }

    /** Re-enqueue items recovered from durable storage on boot, without re-triggering onEnqueue persistence. */
    restore(items: T[], strapi: StrapiLike): void {
        if (items.length === 0) return;
        for (const item of items) {
            this.pending.set(this.options.keyOf(item), item);
        }
        strapi.log.info(`[${this.options.name}] restored ${items.length} pending item(s) from durable storage.`);
        this.scheduleRun(strapi);
    }

    private clearTimer(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }

    private scheduleRun(strapi: StrapiLike): void {
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

    private async runBatch(strapi: StrapiLike): Promise<void> {
        if (this.isRunning || this.pending.size === 0) return;

        this.isRunning = true;
        const items = Array.from(this.pending.values());
        this.pending.clear();
        strapi.log.info(`[${this.options.name}] running ${items.length} item(s).`);

        const concurrency = this.options.concurrency ?? DEFAULT_CONCURRENCY;
        const failedItems: T[] = [];
        let succeededCount = 0;
        try {
            for (let i = 0; i < items.length; i += concurrency) {
                const batch = items.slice(i, i + concurrency);
                await Promise.all(
                    batch.map(async (item) => {
                        const succeeded = await this.options.run(item, strapi).catch(() => false);
                        this.options.onSettled?.(item, succeeded, strapi);
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
                    this.consecutiveFailures = 0;
                } else {
                    // Re-queue failed items for the next (backed-off) run, unless superseded
                    // by a newer enqueue of the same key in the meantime.
                    for (const item of failedItems) {
                        if (!this.pending.has(this.options.keyOf(item))) {
                            this.pending.set(this.options.keyOf(item), item);
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
