---
name: async-cache-invalidation
overview: Add an async, debounced cache invalidation queue and switch middleware/lifecycle hooks to enqueue non-blocking invalidations.
todos:
  - id: create-queue-service
    content: Create async cache invalidation queue service.
    status: completed
  - id: update-middleware
    content: Update cacheInvalidation middleware to enqueue.
    status: completed
  - id: update-lifecycle-hooks
    content: Update lifecycle hooks to enqueue invalidation.
    status: completed
---

# Async Cache Invalidation Queue

## Context

- Follow the existing async queue style in [backend/src/services/asyncSearchIndexQueue.ts](backend/src/services/asyncSearchIndexQueue.ts) for module-level state, debouncing, and logging.

## Plan

- Create [backend/src/services/asyncCacheInvalidationQueue.ts](backend/src/services/asyncCacheInvalidationQueue.ts) modeled after `asyncSearchIndexQueue.ts`:
  - Module state: `pendingTargets` (Set), `isRunning`, `debounceTimer`, `DEBOUNCE_MS = 5000`.
  - `queueCacheInvalidation(target, strapi)` adds to set, logs queueing, and schedules debounced run; no-op or warn if `strapi` missing.
  - Worker copies/clears `pendingTargets` before processing, iterates targets and calls `invalidateNext(target)`; log start/completion and warn on errors.
  - Auto-retry: if new targets arrive while running, schedule another debounced run after completion.
- Update middleware [backend/src/middlewares/cacheInvalidation.ts](backend/src/middlewares/cacheInvalidation.ts):
  - Replace `invalidateNext(...)` calls with `queueCacheInvalidation(target, strapiInstance)` and remove `await`.
  - Keep existing search index queue behavior and guard usage of `strapiInstance` as needed.
- Update lifecycle hooks to enqueue instead of await invalidation:
  - [backend/src/api/article/content-types/article/lifecycles.ts](backend/src/api/article/content-types/article/lifecycles.ts)
  - [backend/src/api/podcast/content-types/podcast/lifecycles.ts](backend/src/api/podcast/content-types/podcast/lifecycles.ts)
  - [backend/src/api/author/content-types/author/lifecycles.ts](backend/src/api/author/content-types/author/lifecycles.ts)
  - [backend/src/api/category/content-types/category/lifecycles.ts](backend/src/api/category/content-types/category/lifecycles.ts)
  - [backend/src/api/privacy/content-types/privacy/lifecycles.ts](backend/src/api/privacy/content-types/privacy/lifecycles.ts)
  - [backend/src/api/imprint/content-types/imprint/lifecycles.ts](backend/src/api/imprint/content-types/imprint/lifecycles.ts)
  - Import `queueCacheInvalidation` and call it with `target` and global `strapi`.

## Key Snippet (Current Pattern)

```
1:15:backend/src/services/asyncSearchIndexQueue.ts
const DEBOUNCE_MS = 5000;
let pendingRebuild = false;
let isRunning = false;
let debounceTimer: NodeJS.Timeout | null = null;
// ... debounce + runRebuild pattern
```

## Todos

- Create async cache invalidation queue service with debounced worker.
- Swap middleware invalidations to enqueue (non-blocking).
- Swap lifecycle hook invalidations to enqueue (non-blocking).