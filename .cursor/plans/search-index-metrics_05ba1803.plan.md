---
name: search-index-metrics
overview: Add performance instrumentation to search index builds and replace jsdom/DOMPurify with markdown-to-txt for plaintext extraction, then wire summary logging for cron/queue triggers.
todos:
  - id: instrument-search-index
    content: Add timings, counts, and payload size logs in builder
    status: completed
  - id: swap-markdown-txt
    content: Replace jsdom/DOMPurify with markdown-to-txt
    status: completed
  - id: wire-summary-logs
    content: Add summary logs in cron and queue paths
    status: completed
  - id: deps-lockfile
    content: Update dependencies and pnpm lockfile
    status: completed
---

# Plan

## What I will change

- Update instrumentation in [`backend/src/services/searchIndexBuilder.ts`](backend/src/services/searchIndexBuilder.ts) to measure fetch timings per content type, cumulative text processing time, total build time, record counts, and final JSON payload size, with key=value structured logs.
- Replace the jsdom + DOMPurify extraction in [`backend/src/services/searchIndexBuilder.ts`](backend/src/services/searchIndexBuilder.ts) with `markdown-to-txt`, preserving truncation, whitespace normalization, and null/undefined handling.
- Add summary logging to both trigger paths in [`backend/src/cron/searchIndex.ts`](backend/src/cron/searchIndex.ts) and [`backend/src/services/asyncSearchIndexQueue.ts`](backend/src/services/asyncSearchIndexQueue.ts).
- Update dependencies in [`backend/package.json`](backend/package.json) to add `markdown-to-txt` and remove `jsdom`, `dompurify`, `@types/jsdom`, `@types/dompurify` if unused elsewhere; run `pnpm install` to refresh the lockfile.

## Implementation details

- Instrument `buildIndex()` with:
- `const buildStart = Date.now()` and compute `buildDurationMs` at the end.
- For each `fetchAllDocuments()` call: measure start/end, compute `fetchMs` per content type, and log counts from the returned arrays (`articlesRaw.length`, etc.).
- Track text processing time by timing the map/normalize step (or a smaller loop around `toPlainText()` calls) and summing into `processingMs`. I will keep a cumulative counter that increments around each `toPlainText()` invocation inside normalization helpers to reflect actual text extraction cost.
- After building `records`, compute payload size with `Buffer.byteLength(JSON.stringify(index), 'utf8')` and log `payloadBytes` and `payloadKb`.
- Replace `toPlainText()` with `markdown-to-txt`:
- `markdownToTxt(value)` for conversion.
- Normalize whitespace with `.replace(/\s+/g, ' ').trim()` and apply max length from `getMaxLen()`.
- Return `undefined` for non-strings or empty results (matching current behavior).
- Add summary logs at the end of builds in both trigger locations:
- Include totals for articles/podcasts/authors/categories, total build duration, total fetch time sum, total processing time, and payload size.
- Use `strapi.log.info` with key=value format (e.g., `buildIndexSummary totalArticles=... totalFetchMs=...`).

## Validation plan (no manual run)

- Note manual validation steps to compare sample output, verify special characters/whitespace/truncation, and confirm search index builds and frontend search work. I will document the steps but will not run them per your preference.

## Notes on dependencies

- I will confirm `jsdom`/`dompurify` usage across `backend/src/` (currently only in `searchIndexBuilder.ts`). If unused elsewhere, I will remove them and their types from `backend/package.json` and update the lockfile with `pnpm install`.