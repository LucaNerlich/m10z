# Changelog

All notable changes to this project will be documented in this file.

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
