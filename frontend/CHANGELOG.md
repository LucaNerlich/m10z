# Changelog

All notable changes to this project will be documented in this file.

## [1.11.0] - 2026-07-01

### Added
- Podcast episodes now play through the Podlove Web Player instead of the native audio element, including episode cover art and a German-localized download file title.
- M12G: the longest win streak now appears directly in the top stats bar, which was restyled as a connected, mobile-friendly strip.

### Fixed
- The Podlove player now collapses by default and releases its reserved height, and falls back gracefully if the player fails to load (with an http CDN allowance in the CSP).

### Changed
- M12G stats no longer show the redundant "nominiert" count — the win count is surfaced instead (including a new leaderboard win badge), and the month's slogan is now visually separated on the month card.
- Prepared the June 2026 M12G post.
- Upgraded dependencies, including undici 8.5.0 and Strapi.

## [1.10.3] - 2026-06-20

### Fixed
- Podcast download tracking now sends a non-bot User-Agent to Umami, so RSS/podcatcher downloads and on-site plays are recorded again — the previous "stable analytics" User-Agent was itself filtered as bot traffic. Downloads now also carry the originating app for per-app breakdowns.
- Preview secret validation is now rate-limited.
- Feed cache warmup errors are now logged instead of swallowed.
- External links in RSS feed HTML now include `rel="noopener"`.

### Changed
- Upgraded Strapi and related dependencies.
- Finalized the May 2026 post and updated the game list with rankings.

## [1.10.2] - 2026-06-09

### Fixed
- RSS podcast download tracking now uses a stable server-side analytics user agent so podcatcher downloads are not silently filtered as bot traffic.

### Changed
- Updated frontend and backend dependency patch versions.

## [1.10.1] - 2026-06-05

### Changed
- Category tags and homepage meta tags use regular font weight instead of bold.

### Fixed
- Committed shared contract copies so frontend-only Docker builds do not depend on the repo-root `shared/` folder at image build time.

## [1.10.0] - 2026-06-05

### Added
- Shared cross-repo invalidation manifest with a synced local copy on predev, prebuild, and pretest.
- Search index module (`searchIndexService`) for load, validation, Fuse caching, and static-page augmentation; the API route is now a thin HTTP adapter.
- Slug-page metadata builder (`buildContentSlugMetadata`) shared by article, podcast, category, and author routes.
- Category page loader (`fetchCategoryPageData`) with parallel batched article and podcast hydration.
- Feed registry owning RSS disk cache, schedulers, and invalidation side effects.

### Changed
- Content access reads consolidated into `contentAccess.ts`; `fetchJson` and `reads` remain as deprecated shims.
- Cache invalidation taxonomy derives target names from the shared manifest.

## [1.9.0] - 2026-06-05

### Added
- Public CMS import surface at `src/lib/strapi/` for content types, media helpers, cache tags, and the unified Strapi read interface.

### Changed
- CMS types and media helpers are imported from `strapi/` instead of the RSS folder, so UI, JSON-LD, and feeds share one namespace.
- All Strapi HTTP reads (pages, sitemap, feeds) go through one Content access read interface; endpoint vs `/api/` path shape and privileged auth are handled internally.
- Cache invalidation tag sets are defined next to fetch-surface tag builders so read and purge sides cannot drift.
- RSS feed assembly (fetch → XML → ETag) lives in dedicated build modules; route handlers only wire HTTP caching.
- M12G Archive loading uses an explicit filesystem MonthSource adapter in production — same reader-facing data, swappable in tests.
- Strapi media URLs and markdown image URLs share one base-URL resolver.

## [1.8.0] - 2026-06-05

### Changed
- M12G: the request-cached archive is now the single aggregation hub — title-defender marking and the overview view-model (stats, streaks, newest-first months) are derived once behind the archive instead of being recomposed in the page. No change to what's displayed.
- Collapsed the parallel article/podcast Strapi fetchers behind one content-type descriptor, so batching, cache-tagging, and pagination are defined once. Same data and cache behaviour.
- Cache tags are now built from one shared module used by both the data fetchers (read) and the invalidation taxonomy (write), so a tag can no longer drift between where it is set and where it is purged.
- The Strapi transport now owns the privileged-read token and base-URL resolution; the feeds and search index request a "privileged" read instead of wiring the token themselves.
- The RSS and audio feed handlers now share one feed-definition module (site URL, channel query, list-query builder, fetch orchestration, ETag), removing the duplicated wiring between them.

### Removed
- Unused content-list fetchers, feed populate presets, and feed-route helpers.

### Fixed
- Production Content-Security-Policy now includes the configured Strapi origin in `connect-src`, so service workers (e.g. Umami session replay) and `fetch()` can load podcast audio and other Strapi uploads; previously only `media-src` allowed them.

## [1.7.4] - 2026-06-05

### Added
- Expanded the Vitest suite to 486 tests, covering the new M12G archive pipeline, the unified Strapi transport (auth, retries, timeout, cache directives), paginated feed fetching, published-slug pagination, content-fetch helpers, and the cache-invalidation endpoint.

### Changed
- Refactored the M12G data layer behind a single request-cached archive: the months are loaded, sorted, and aggregated once per request instead of repeatedly per page, and a game's appearance timeline is now derived from its history rather than re-scanning every month. No change to what's displayed.
- Unified all Strapi data fetching behind one transport seam with shared timeout, single-retry, and cache-tag handling; behaviour and auth (content unauthenticated, feeds/search tokened) are unchanged.
- Updated `dompurify` to 3.4.7.

### Fixed
- Reserve the scrollbar gutter page-wide so the layout no longer shifts horizontally when navigating between pages with and without a vertical scrollbar.

## [1.7.3] - 2026-06-02

### Added
- May 2026 M12G (Mindestens 12 Gamevorschläge) article placeholder with curated game list.

### Changed
- `articleBody` is now included in the `BlogPosting` JSON-LD on article pages: article content is stripped of Markdown syntax and embedded as plain text (capped at 10 000 characters), giving search engines direct access to the article body.
- Removed the `potentialAction` / `SearchAction` block from the site-wide `WebSite` schema — it was pointing to a JSON API endpoint rather than a user-facing search page, which would have caused Google's Sitelinks Search Box to malfunction.

## [1.7.2] - 2026-05-29

### Added
- Expanded the Vitest suite to cover the RSS feed pipeline (XML escaping, Strapi media normalization, Markdown→HTML sanitization/XSS, article feed, feed-route helpers), Strapi query builders, metadata helpers (excerpt, keywords, Open Graph image), Markdown preprocessing and heading extraction, JSON-LD generators, analytics event IDs, image URL/hostname allow-listing, client-IP parsing, and relative date formatting. The suite now runs 436 tests across 38 files as part of `pnpm run build`.
- Cross-package contract test pinning the cache-invalidation target list to the Strapi backend's, so the frontend taxonomy and backend targets can no longer drift silently.

## [1.7.1] - 2026-05-28

### Added
- The on-site audio player on podcast detail pages now routes through the same download-tracking endpoint as the RSS feed, so plays started on the website are recorded as `podcast-download` Umami events too (when `FEED_AUDIO_TRACKING_ENABLED` is enabled).

### Changed
- Podcast download counting now ignores seek/continuation range requests so a single play or download counts once; with tracking enabled the on-site player uses `preload="none"` so the event fires when playback starts rather than on every page load.

## [1.7.0] - 2026-05-28

### Added
- Podcast RSS download tracking: when enabled, each episode's `<enclosure>` URL points at an on-domain endpoint that records a custom Umami `podcast-download` event (episode slug and title) before redirecting to the audio file, so downloads initiated by podcatcher apps can finally be measured. Off by default; toggle with the `FEED_AUDIO_TRACKING_ENABLED` environment variable. Episode GUIDs stay identical whether tracking is on or off, so existing subscribers are unaffected.

### Changed
- Build/dependency tooling: pinned pnpm to v10 and removed redundant `ignore-scripts` settings from `.npmrc`.

## [1.6.0] - 2026-05-16

### Added
- Per-game detail pages at `/m12g/spiele/[slug]`: each nominated game now has its own shareable page with stats (nominations, wins, total votes) and a per-month timeline showing votes earned and which months it won. All 56 pages are prerendered at build time; unknown slugs return 404.
- Streaks card on `/m12g`: highlights the longest consecutive-month nomination streak and the longest consecutive-month win streak, with deep links to the streak holder's detail page.
- Open Graph image for `/m12g`: dynamic share card showing the all-time top-3 leaderboard.

### Changed
- Game names in the leaderboard and game index now link to the internal detail pages; the external store link is preserved as a small `↗` affordance next to each name.

## [1.5.7] - 2026-05-16

### Added
- Vitest test suite for pure utility modules — m12g pipeline (parser, game-history aggregate, stats projections, title-defender derivation), formatters, validators, security helpers (slug validation, secret comparison, rate limit). 18 test files / 215 tests, runs in ~150ms. `pnpm test` (watch) and `pnpm test:run` (one-shot) scripts.

### Changed
- `pnpm run build` now runs `vitest run` before `next build`, so failing tests block the build and regressions in pure-logic modules are caught at build time.

### Fixed
- `formatMonthCompact` no longer throws `RangeError` on invalid month-id input; falls back to the input string, matching `formatMonthLong` and `formatMonthShort` behaviour.

## [1.5.6] - 2026-05-16

### Changed
- Refactored the M12G data pipeline: markdown parsing is split from filesystem loading, a new Game-history aggregate powers both the leaderboard and the alphabetical game index, and title-defender derivation is now a pure projection (no in-place mutation). No behaviour changes for valid month files.

### Fixed
- M12G month files with missing required frontmatter (`forum`, `title`, `finalized`) or malformed list items now fail loud with the file name in the error, instead of silently dropping the month from the overview.

## [1.5.5] - 2026-05-16

### Changed
- Added `.npmrc` with supply-chain security settings: 7-day package quarantine, blocked exotic subdependency specifiers, and disabled lifecycle scripts
- Updated April 2026 m12g list content

## [1.5.4] - 2026-05-11

### Fixed
- Docker production build no longer fails on `/changelog` prerender with `ENOENT: /app/public/changelog.md`: the root and `frontend/` `.dockerignore` files excluded all `*.md` from the build context, so `CHANGELOG.md` was missing inside the container and `scripts/copy-changelog.mjs` had nothing to copy; both files now whitelist `CHANGELOG.md` with `!CHANGELOG.md`, and the script exits with a clear error (instead of warning and continuing) when the source file is missing, so this kind of misconfiguration fails fast and visibly

## [1.5.3] - 2026-05-11

### Changed
- Simplified the `/changelog` implementation: a new `scripts/copy-changelog.mjs` prebuild step copies `CHANGELOG.md` to `public/changelog.md`, and the page reads it directly via `fs.readFileSync`; replaces the previous generated TypeScript module approach. As a bonus, the raw markdown is now also available at `/changelog.md`

### Fixed
- Silenced a pre-existing Turbopack "Encountered unexpected file in NFT list" build warning originating from `src/lib/rss/feedCache.ts` runtime cache writes; the documented `/*turbopackIgnore: true*/` magic comment is a no-op for `fs.*` / `path.join` (it only applies to dynamic imports/requires), so the warning is suppressed via the new `turbopack.ignoreIssue` config in `next.config.ts`

## [1.5.2] - 2026-05-11

### Fixed
- `/changelog` page now shows content: replaced the fragile build-time `process.cwd()` + env-var approach with a `scripts/generate-changelog.mjs` prebuild script that uses `import.meta.dirname` (always relative to the script file, never to the working directory) to read `CHANGELOG.md` and write its content into `src/generated/changelog-content.ts`; the page imports this TypeScript constant directly, so the content is resolved at compile time regardless of where the CI/CD runner executes from

## [1.5.1] - 2026-05-11

### Fixed
- `/changelog` page now builds reliably in all CI/CD environments: `CHANGELOG.md` is read in `next.config.ts` where `process.cwd()` is guaranteed to be the project root, then injected as a build-time environment variable (`BUILD_CHANGELOG_CONTENT`) — eliminating runtime filesystem access and the path ambiguity that broke cloud builds

## [1.5.0] - 2026-05-10

### Added
- Version number in the site footer (next to the font and theme pickers) linking to a new `/changelog` page that renders this CHANGELOG; the footer label and the page's metadata both read from `package.json` so future releases update both automatically

### Fixed
- `/changelog` loads `CHANGELOG.md` reliably in CI and cloud deploys: `getChangelogMarkdown()` checks both the app root and `frontend/CHANGELOG.md` when `process.cwd()` is the monorepo root, and `outputFileTracingIncludes` in `next.config.ts` forces the file into the traced server output so Turbopack/serverless bundles no longer omit it

## [1.4.0] - 2026-05-10

### Added
- Per-page Twitter Card metadata on all static and list routes (`/`, `/artikel`, `/podcasts`, `/kategorien`, `/team`, `/datenschutz`, `/impressum`, `/feeds`, `/m12g`, `/m12g/spiele`, `/ueber-uns`); previously these routes inherited the root default and rendered with the wrong title in social shares
- `articleSection`, `keywords`, `wordCount`, and `inLanguage` fields on `BlogPosting` JSON-LD; `keywords`, `inLanguage`, and a `partOfSeries.image` on `PodcastEpisode` JSON-LD
- `inLanguage` and `isPartOf` (WebSite reference) on `CollectionPage` (category) and `ProfilePage` (author) JSON-LD; `worksFor` (Organization reference) on author `Person` JSON-LD
- Description fallback for article and podcast detail pages: when the CMS `description` is empty, a 155-character excerpt is now derived from the article body or podcast shownotes for both the `<meta name="description">` tag and the JSON-LD, eliminating duplicate meta descriptions across articles
- Alt text on the static `/images/m10z.jpg` Open Graph image for every static and list route

### Changed
- Consolidated the eleven near-identical static-page metadata blocks behind a single `buildStaticListMetadata()` helper that emits the standard OpenGraph, Twitter Card, canonical URL, and alt-tagged share image in one call

## [1.3.4] - 2026-05-10

### Changed
- Centralised image URL handling behind a single `lib/image` module: the hostname allowlist, Strapi-relative URL resolution, and search-index URL normalisation now live in one place; `SearchModal`'s duplicated normaliser was collapsed onto the shared seam
- Split the Markdown component's plugin pipeline and rehype-sanitize allowlist out into `lib/markdown/plugins.ts` and the custom inline-syntax pre-processor (`==mark==`, `++ins++`, `^sup^`, `~sub~`) into `lib/markdown/preprocess.ts` so the security-relevant allowlist is auditable in one file
- Extracted the article and audio feed handlers' shared paginated-fetch and feed-single-config logic into `lib/rss/feedFetcher.ts`; both handlers slimmed (article 140 → 90 lines, audio 360 → 311 lines) while preserving their content-specific concerns intact
- Replaced the 16 inline `qs.stringify` call sites in `lib/strapiContent.ts` with three intent-shaped query builders (`buildBySlugQuery`, `buildBySlugsQuery`, `buildListQuery`) and named populate presets in `lib/strapi-queries`; the file shrank from 1,214 to 787 lines and each fetcher is now 5–15 lines of intent
- Tightened the cache-invalidation taxonomy: the frontend `InvalidationTarget` type now derives from `INVALIDATION_TAXONOMY` keys, the backend collapses its separate publish/update target maps into one declarative `UID_TO_TARGETS` config, and a documented cross-wire contract is now present in both files
- Added a `pnpm run snapshot:feeds` script that locks the public `/rss.xml` and `/audiofeed.xml` XML byte-output to a golden fixture; runs after refactors as a regression guard
- Upgraded backend dependencies (Strapi-side) and minor frontend dependency bumps
- Updated team page description copy

## [1.3.3] - 2026-05-06

### Fixed
- RSS and audio feed requests no longer block on synchronous Strapi rebuilds — the request path always serves the cached XML from disk or memory; the background scheduler is the sole refresh path under normal operation. Prevents the request-pile-up failure mode that previously crashed the site under load.

### Changed
- Consolidated the article and audio feed route handlers into a shared `feedCache` module that owns disk I/O, scheduling, ETag/304, rate limiting, and fallback responses; the per-feed handlers now only supply Strapi fetch and XML generation specifics

## [1.3.2] - 2026-05-06

### Added
- April 2026 M12G dataset draft

### Changed
- Upgraded Next.js (16.2.3 → 16.2.4), undici, dompurify, and @fancyapps/ui
- Cache invalidation endpoints now accept either `FEED_INVALIDATION_TOKEN` or `LEGAL_INVALIDATION_TOKEN` for any target
- Consolidated ten `/api/<type>/invalidate` route handlers into a single dynamic `/api/[target]/invalidate` route backed by a declarative invalidation taxonomy

## [1.3.1] - 2026-04-20

### Added
- Status page link (status.m10z.de) in the footer's Rechtliches section

## [1.3.0] - 2026-04-20

### Added
- Enabled Umami session replay by default via `recorder.js` with `data-sample-rate`, `data-mask-level`, and `data-max-duration` attributes
- Support overriding the Umami base URL via `NEXT_PUBLIC_UMAMI_URL`; session replay tunables via `NEXT_PUBLIC_UMAMI_SAMPLE_RATE`, `NEXT_PUBLIC_UMAMI_MASK_LEVEL`, and `NEXT_PUBLIC_UMAMI_MAX_DURATION`

## [1.2.3] - 2026-04-16

### Fixed
- Participation chart now shows newest months first, consistent with the Hall of Fame ordering

## [1.2.2] - 2026-04-16

### Added
- Early Access badge on M12G game cards, replacing the verbose "(Early Access)" suffix in game titles with a compact "EA" pill

## [1.2.1] - 2026-04-16

### Added
- March 2026 M12G dataset ("Early-Access-Armee vs. Full-Release-Rudel")

### Fixed
- Titelträger badge only appearing for one game when multiple previous winners were nominated again

## [1.2.0] - 2026-04-13

### Added
- `/llms.txt` route following the llmstxt.org proposal for LLM-friendly site discovery

### Changed
- Updated undici dependency (7.24.7 → 7.24.8)

## [1.1.2] - 2026-04-11

### Changed
- Added technical inline comments across 26 files in frontend and backend to improve readability and maintainability
- Documented non-obvious patterns: retry/backoff strategies, Strapi response normalization, atomic writes, timing-safe comparison, feed deduplication, focus trapping, and cache invalidation hierarchies

## [1.1.1] - 2026-04-11

### Fixed
- Feed rebuild race condition where concurrent disk writes could corrupt cached XML
- Article feed `lastBuildDate` changing on every rebuild, defeating ETag-based 304 responses
- New content taking up to 30 minutes to appear in feeds after publishing (now rebuilds within 10 seconds)
- In-memory feed cache bypassed on every request, causing unnecessary disk I/O
- Invalid `<lastBuildDate>` element inside `<item>` tags in audio feed (RSS 2.0 spec violation)
- Missing XML declaration in generated article and audio feeds
- ETag comparison not handling multi-value `If-None-Match` headers per RFC 7232
- Fallback feed XML not escaping interpolated values
- Rate limit cleanup timer preventing clean process exit

### Changed
- Feed disk writes now use atomic rename to prevent partial-file corruption on crash
- Feed invalidation uses debounced rebuild to prevent server overload during batch publishing

## [1.1.0] - 2026-04-11

### Added
- Related content sections on article and podcast detail pages
- Searchable game index page at /m12g/spiele
- Static pages included in search index
- Open Graph image generation for improved social sharing
- Scheduled publishing support for prepared entries
- SQL injection protection on user-facing inputs
- Retry logic for transient Strapi fetch failures (timeouts, connection resets)

### Fixed
- Cache invalidation now covers related-content, article-feed, and audio-feed tags
- Sitemap invalidation endpoint returning incorrect response body
- Secret verification no longer leaks token length through timing differences
- Improved error handling and logging in cache invalidation process

### Changed
- Updated dependencies (Next.js 16.2.3, React 19.2.5, undici 7.24.7)
- Refactored content structure to use root attributes instead of BaseContent component
- Removed Beta badge from M12G header
