---
name: RSS scheduler & memory diagnostics
overview: Fix the RSS feed scheduler memory leak by retaining and cleaning up interval timers (including HMR disposal), then add memory usage diagnostics plus a secured reset endpoint to manually stop schedulers.
todos:
  - id: timer-lifecycle
    content: Add `schedulerTimer`, implement `stopScheduler()`, wire `ensureScheduler()` to store timer, and add `module.hot.dispose` cleanup in both feed handlers.
    status: completed
  - id: memory-instrumentation
    content: Instrument feed generation with `process.memoryUsage()` start/end and add `memoryUsedMB` + `memoryDeltaMB` to build diagnostic event detail objects; add docs in `runtimeDiagnostics.ts`; add memory snapshot to diagnostics API response.
    status: completed
    dependencies:
      - timer-lifecycle
  - id: reset-endpoint
    content: Create secured `GET /api/diagnostics/reset-schedulers` route that calls both `stopScheduler()` functions and returns a detailed before/after timer state + current memory snapshot.
    status: completed
    dependencies:
      - timer-lifecycle
---

# RSS scheduler lifecycle + memory diagnostics

## Goals
- Stop the **HMR-induced interval leak** in the RSS feed modules by retaining the `setInterval` handle and clearing it on module disposal.
- Add **memory usage diagnostics** (heap used + delta) around feed generation and expose a process memory snapshot via the diagnostics API.
- Provide a **secured manual reset endpoint** to stop both schedulers on demand (useful for deploys/testing; production should normally run continuously).

## 1) Fix scheduler timer lifecycle (Task 1)
Files:
- [`/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/audioFeedRouteHandler.ts`](/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/audioFeedRouteHandler.ts)
- [`/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/articleFeedRouteHandler.ts`](/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/articleFeedRouteHandler.ts)

Changes (both files):
- Add **module-level** `let schedulerTimer: ReturnType<typeof setInterval> | null = null;`
- Update `ensureScheduler()` to:
  - Set `schedulerStarted = true`
  - Assign `schedulerTimer = setInterval(...)`
  - Keep the existing `(timer as any).unref?.()` call (for graceful process exit)
- Add and export `stopScheduler()` that:
  - If `schedulerTimer` exists, `clearInterval(schedulerTimer)` and set it back to `null`
  - Reset `schedulerStarted = false`
  - Per your choice: **do not** clear `cachedFeed` / `inflight` (interval-only stop)
- Add HMR cleanup:
  - `if (module.hot) { module.hot.dispose(() => stopScheduler()); }`
- Add a short comment near `stopScheduler()` explaining when to call it (deploy/testing/HMR) and that it’s not required in normal production steady-state.

## 2) Add memory diagnostics (Task 2)
Files:
- [`/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/audioFeedRouteHandler.ts`](/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/audioFeedRouteHandler.ts)
- [`/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/articleFeedRouteHandler.ts`](/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/articleFeedRouteHandler.ts)
- [`/Users/nerlich/workspace/luca/m10z/frontend/src/lib/diagnostics/runtimeDiagnostics.ts`](/Users/nerlich/workspace/luca/m10z/frontend/src/lib/diagnostics/runtimeDiagnostics.ts)
- [`/Users/nerlich/workspace/luca/m10z/frontend/app/api/diagnostics/route.ts`](/Users/nerlich/workspace/luca/m10z/frontend/app/api/diagnostics/route.ts)

Changes:
- In each feed handler’s `refreshFeed()` (the actual “feed generation” path):
  - Capture `const memStart = process.memoryUsage();` immediately before building.
  - Capture `const memEnd = process.memoryUsage();` immediately after building.
  - Compute heap delta: `const memoryDeltaMB = (memEnd.heapUsed - memStart.heapUsed) / (1024 * 1024);`
  - Include `memoryUsedMB` (end `heapUsed` in MB) and `memoryDeltaMB` in the **diagnostic event `detail` object** for the `feed.*.build` event.
- In `runtimeDiagnostics.ts`:
  - Add doc comments to `DiagnosticEvent` explaining that `detail` may optionally include memory-related numeric fields such as `memoryUsedMB` and `memoryDeltaMB` (MB, derived from `process.memoryUsage().heapUsed`).
- In diagnostics API route:
  - Add a `memory` field to the JSON response with a current `process.memoryUsage()` snapshot alongside `events`.

## 3) Manual cleanup endpoint (Task 3)
Files:
- Add new route: [`/Users/nerlich/workspace/luca/m10z/frontend/app/api/diagnostics/reset-schedulers/route.ts`](/Users/nerlich/workspace/luca/m10z/frontend/app/api/diagnostics/reset-schedulers/route.ts)
- Update feed handlers to export `stopScheduler()` and (optionally) a tiny `getSchedulerState()` helper for reporting.

Endpoint behavior:
- Auth:
  - Require `DIAGNOSTICS_TOKEN` using the same pattern as existing diagnostics route (`token` query param or `x-m10z-diagnostics-token` header) via `verifySecret`.
- Action:
  - Call `stopScheduler()` from both feed handlers.
- Response (detailed, per your choice):
  - Return JSON including per-scheduler previous/current state, e.g. `previousHasTimer`, `previousSchedulerStarted`, `currentHasTimer`, `currentSchedulerStarted`, plus `now` and a current `process.memoryUsage()` snapshot.
- Documentation:
  - Comment in the new route describing intended use (deploy/testing), auth requirement, and that production schedulers should generally run continuously.

## Verification
- Ensure the new `stopScheduler()` is reachable from HMR disposal and from the reset endpoint.
- Confirm no interval is created without being tracked in `schedulerTimer`.
- Confirm diagnostics payload includes memory fields for `feed.audio.build` / `feed.article.build` and `GET /api/diagnostics` includes `memory`.