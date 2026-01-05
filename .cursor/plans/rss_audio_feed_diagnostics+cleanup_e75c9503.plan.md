---
name: RSS audio feed diagnostics+cleanup
overview: Add per-operation timing diagnostics and aggregation for audio feed builds, implement safe markdown/JSDOM cleanup plus per-build markdown caching, and introduce diagnostics endpoints/state-reset logic to prevent long-running slowdowns.
todos:
  - id: t1-audiofeed-timings
    content: Instrument `renderItem()` and `generateAudioFeedXml()` with per-op timings (markdown, guid, fileMetadata, enclosure) and return aggregated min/max/avg stats.
    status: completed
  - id: t1-routehandler-detail
    content: "Plumb aggregated timing into `buildAudioFeedResponse()` diagnostics detail, including average-per-episode fields: `markdownConversionMs`, `guidGenerationMs`, `fileMetadataMs`."
    status: completed
    dependencies:
      - t1-audiofeed-timings
  - id: t2-markdown-jsdom-cleanup
    content: Refactor `markdownToHtml()` to create a fresh JSDOM per conversion with try/finally cleanup; add exported `getMarkdownToHtmlState()` counters/state.
    status: completed
  - id: t2-per-build-markdown-cache
    content: Add per-build markdown->HTML cache in `audioFeedRouteHandler` (episode id + content hash key), with hit/miss/size stats included in diagnostics.
    status: completed
    dependencies:
      - t2-markdown-jsdom-cleanup
      - t1-audiofeed-timings
  - id: t3-auto-reset
    content: Add build duration tracking + threshold check (last 3 > 2x initial) and implement `resetAudioFeedState()` including diagnostic logging.
    status: completed
    dependencies:
      - t1-routehandler-detail
      - t2-per-build-markdown-cache
  - id: diag-library-state-endpoint
    content: Create `/api/diagnostics/library-state` endpoint (token-protected) returning markdown processor state, JSDOM counters, cache sizes, and audio feed scheduler health.
    status: completed
    dependencies:
      - t2-markdown-jsdom-cleanup
      - t3-auto-reset
  - id: diag-route-augment
    content: Extend existing `/api/diagnostics` JSON to include scheduler uptime/build trend/threshold status for visibility into long-running process health.
    status: completed
    dependencies:
      - t3-auto-reset
---

# RSS audio feed diagnostics, cleanup, and auto-reset

## Goals
- **Task 1**: Add granular timing around the expensive parts of audio feed item rendering, aggregate across episodes (min/max/avg), and include this data in `feed.audio.build` diagnostics.
- **Task 2**: Prevent long-lived resource accumulation in markdown/HTML processing (explicit JSDOM cleanup), add a per-build markdown conversion cache, and document lifecycle requirements.
- **Task 3**: Add a safety mechanism to self-reset when builds degrade over time, and expose scheduler + library health via diagnostics endpoints.

## Proposed implementation (by file)

### 1) Add per-operation timings + aggregation
- Update [`/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/audiofeed.ts`](/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/audiofeed.ts)
  - Refactor `renderItem()` to accept an optional **timing collector** (passed in from the feed builder) and record timings for:
    - **Markdown conversion**: time spent in `markdownToHtml()` for shownotes + footer.
    - **GUID generation**: time spent in `sha256Hex(enclosureUrl)`.
    - **File metadata normalization**: time for `normalizeStrapiMedia()` + length normalization + mime picking.
    - **Enclosure handling**: time for `mediaUrlToAbsolute()` + building enclosure attributes (URL/length/type).
  - Add a small `TimingStats` helper that maintains per-operation:
    - `count`, `totalMs`, `minMs`, `maxMs`, `avgMs` (computed).
  - Extend `generateAudioFeedXml()` return value to include an aggregated timing object, e.g.:
    - `timing: { markdown: {...}, guid: {...}, fileMetadata: {...}, enclosure: {...} }`

### 2) Expand audio feed route diagnostics detail + add per-build markdown cache
- Update [`/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/audioFeedRouteHandler.ts`](/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/audioFeedRouteHandler.ts)
  - Inside `getCachedAudioFeed()` (or directly around the `generateAudioFeedXml()` call), create a per-build **markdown conversion cache**:
    - `Map<string, string>` with keys derived from `episode.id` + content hash (e.g. `sha256Hex(shownotes + '\n' + footer)`), plus a stable discriminator to avoid collisions.
    - Track cache stats: `hits`, `misses`, `size`.
    - Pass a cached markdown wrapper into `generateAudioFeedXml()` / `renderItem()` so repeated conversions within the same build reuse HTML.
    - Clear automatically on each rebuild by scoping the cache to a single `refreshFeed()`.
  - Expand `recordDiagnosticEvent()` detail for `feed.audio.build`:
    - Add requested fields (per your choice: **average per episode**):
      - `markdownConversionMs`, `guidGenerationMs`, `fileMetadataMs`
    - Also include full breakdown object with `minMs/maxMs/avgMs/count` per op.
    - Include cache stats (`markdownCacheHits`, `markdownCacheMisses`, `markdownCacheSize`).

### 3) Fix markdown/JSDOM lifecycle and expose library state
- Update [`/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/markdownToHtml.ts`](/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/markdownToHtml.ts)
  - Change implementation to **create and dispose a fresh JSDOM window per conversion** (per your selection):
    - Wrap conversion in `try/finally` and call `window.close()` in the `finally`.
  - Add lightweight module-level counters/state and export a function like `getMarkdownToHtmlState()` that reports:
    - JSDOM windows created/closed
    - (Optional) last conversion timestamp and cumulative conversion count
    - Marked options/config snapshot (non-sensitive)
  - Add comments documenting why this is required (long-lived scheduler + JSDOM/DOMPurify lifecycle).

### 4) New diagnostics endpoint: library-state
- Create [`/Users/nerlich/workspace/luca/m10z/frontend/app/api/diagnostics/library-state/route.ts`](/Users/nerlich/workspace/luca/m10z/frontend/app/api/diagnostics/library-state/route.ts)
  - Auth + rate limit: match `/api/diagnostics` and `/api/diagnostics/reset-schedulers` (requires `DIAGNOSTICS_TOKEN`, supports `?token=` or `x-m10z-diagnostics-token`).
  - Return JSON including:
    - `markdownToHtml`: output of `getMarkdownToHtmlState()`
    - `audioFeedScheduler`: extended state from `audioFeedRouteHandler` (see next section)
    - `memory`: `process.memoryUsage()`
    - Any known cache sizes/state (markdown cache stats from last build, cached feed metadata but not the XML).

### 5) Auto-reset mechanism for slow build detection + scheduler health reporting
- Update [`/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/audioFeedRouteHandler.ts`](/Users/nerlich/workspace/luca/m10z/frontend/src/lib/rss/audioFeedRouteHandler.ts)
  - Track build durations over time in the scheduler:
    - Store `schedulerStartedAtMs`, `initialBuildDurationMs` (first successful build), and a ring buffer of recent `buildDurationsMs`.
    - Implement threshold rule: **if the last 3 builds are each > 2× `initialBuildDurationMs`, trigger a reset**.
  - Implement `resetAudioFeedState(reason)` that:
    - Clears `cachedFeed` + `inflight`
    - Resets duration tracking counters/buffers
    - Clears any stored “last build” cache stats
    - Optionally restarts the interval timer (stop + ensureScheduler) to guarantee a clean loop
    - Records a diagnostic event (e.g. `feed.audio.reset`) with the reason + recent durations.
  - Expose this via an expanded exported getter (e.g. `getAudioFeedRuntimeState()`) so diagnostics routes can report:
    - scheduler uptime
    - consecutive builds tracked
    - trend analysis (increasing/stable) derived from the ring buffer
    - threshold status and “would reset” boolean

- Update [`/Users/nerlich/workspace/luca/m10z/frontend/app/api/diagnostics/route.ts`](/Users/nerlich/workspace/luca/m10z/frontend/app/api/diagnostics/route.ts)
  - Add `audioFeed` (and optionally `articleFeed`) scheduler runtime state to the JSON response so the existing diagnostics endpoint surfaces process health.

## Notes / constraints
- **Security**: diagnostics endpoints will remain protected by `DIAGNOSTICS_TOKEN` and rate limited; returned state will be numeric/structural only (no secrets, no feed XML, no episode content).
- **Performance**: per-call JSDOM creation is heavier, but the per-build markdown cache should reduce the number of conversions during a build and mitigate overhead.

## Verification
- Add/adjust unit-level checks (if present) or run the feed generation path locally and confirm:
  - `feed.audio.build` events now contain per-operation timing breakdown + new fields
  - `markdownToHtml` does not retain long-lived windows (created/closed counters advance together)
  - `/api/diagnostics/library-state` returns the expected JSON and is unauthorized without token
  - Auto-reset triggers under simulated slow-build conditions (can temporarily force an artificial delay behind an env flag during local testing, then remove the flag).