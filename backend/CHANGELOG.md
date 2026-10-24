# Changelog

All notable changes to this project will be documented in this file.

## [2.0.1] - 2026-10-24

### Changed
- pnpm hardening (`minimumReleaseAge`, `blockExoticSubdeps`) now lives in `pnpm-workspace.yaml`; the legacy `.npmrc` is gone.
- Dependencies are updated (Strapi 5.59, dotenv 18.0.9).

## [2.0.0] - 2026-10-22

### Breaking
- Node.js 24 or newer is required (previously 22). The workspaces, the CI workflows and `AGENTS.md` pin the same version. The HTTP API and the stored data are unchanged.

### Changed
- `form-data` and `node-fetch` are declared as direct dependencies instead of relying on transitive copies.
- The manifest drops its exact `packageManager` pin; `engines.pnpm ^10` covers the toolchain instead.

## [1.4.5] - 2026-10-21

### Fixed
- The admin preview link uses the version being previewed, so previewing a published article after a draft slug change no longer returns 404.
- `BASE_DOMAIN` accepts a default port and mixed-case origins, and rejects a lone `?` or `#` that would corrupt every media URL.
- Production refuses to boot with a plaintext `FRONTEND_URL` instead of dead-lettering every cache invalidation at runtime.
- Production refuses to boot without `STRAPI_INVALIDATION_SECRET`, or with a whitespace-only one, instead of silently dropping every cache invalidation.
- Removed the Strapi 4 fallback from the search-index save path (no behaviour change).
- Removed dead multi-document plumbing from the cache-invalidation middleware (no behaviour change).

## [1.4.4] - 2026-10-20

### Fixed
- Uploads that take longer than two minutes are accepted: the request timeout covers the 2 GB allowance, and the unreachable server-retry loop is gone.
- The blurhash backfill skips images above 20 MB without reading them and scans newest-first, so unreadable rows cannot starve new uploads.
- Cache invalidation covers single-type create/delete and admin clones, resolving the cloned document rather than the source.
- The YouTube component accepts the same URL variants as the renderer, including scheme-less, mixed-case and whitespace-padded forms.

## [1.4.3] - 2026-10-20

### Fixed
- Author and category routes now reject anonymous draft reads like the article and podcast routes.
- Cache invalidation skips slug resolution for single types instead of looking one up.
- A podcast duration is cleared when the replacement file cannot be read.
- Rate-limit bookkeeping stays bounded when every entry is live.
- Multipart bodies that are not uploads are rejected before parsing.
- The audio migration verifies the media library before retrying an upload and refuses redirects when downloading.
- Reading-time estimation ignores `~`-fenced code.

### Changed
- Removed the unreachable richtext object/array normalizer.
- `SearchRecordType` is derived from `SEARCH_RECORD_TYPES` in the shared contracts.
- The SQL-injection guard import stays inside the backend workspace, and the admin dev tsconfig points at the installed pnpm store hash.

## [1.4.2] - 2026-10-19

### Fixed
- Cache invalidation refuses to run in production when `FRONTEND_URL` is unset instead of silently posting to `localhost:3000`.
- Shutdown handling is hardened: an uncaught exception exits the process with a non-zero code, and the shutdown watchdog is armed before the HTTP server starts closing.
- Podcast durations no longer round to zero for very short files.
- The Umami statistics plugin parses v2 metric objects (`{value, prev}`) again.
- The caption pipeline verifies the media-library response before retrying a wrong-shape upload.
- The SQL-injection guard now also flags template-literal concatenation.

### Changed
- The admin panel's cookie domain is configured with its own environment variable instead of being derived from `BASE_DOMAIN`.
- Internal dead-code removal (shared contract alias, unused admin example, script and plugin constants) and additional tests.

## [1.4.1] - 2026-10-18

### Fixed
- Anonymous `?status=draft` reads on the content API are now reliably blocked: the policy loads on the article and podcast routes, and the frontend's preview path uses a privileged API token for drafts.
- The request pipeline is hardened: a global body-size cap, CORS pinned to the known frontend origins, the unused and unenforceable Public-role grants removed, and the 2 GB media upload limit restored.
- Scheduled publishing bounds its fan-out and skips overlapping runs; a throwing invalidation-queue callback no longer aborts the whole batch.
- Cache invalidation also fires when a content-API create arrives with status published.
- YouTube embeds accept the URL forms the renderer actually supports, and auth emails are sent from the m10z domain.
- The audio migration uses the upload's timeout for downloads, and the search-index build pages with a stable sort.
- The admin dev server no longer fails its dependency scan when the media library contains HTML files.

### Changed
- Dependency upgrades (sharp, dotenv).
- Internal refactors (shared MCP transport, metrics and uploads helpers), documentation, and `.env.example` updates.

## [1.4.0] - 2026-10-12

### Added
- `pnpm caption:images`: an operator pipeline that lists Media Library images through the Strapi MCP, generates German alt text and captions with a configurable vision model (opencode go), and writes them back. It is a dry run by default and only fills missing text unless `--force` is given.

### Fixed
- The caption pipeline no longer retries — or fails noisily on — images the decoder cannot read; corrupt or unsupported files are skipped with a clear reason.

## [1.3.0] - 2026-08-07

### Added
- Cache invalidation now survives a restart or redeploy: pending invalidation events are persisted to Postgres and redelivered on boot if they weren't confirmed delivered.

### Changed
- Cache invalidation is now driven by a single shared content-type registry and a single Document Service middleware, replacing the previous mix of hardcoded UID maps and per-content-type lifecycle hooks.
- Invalidation payloads are now entity-level (type, action, slug, related author/category slugs) instead of coarse target names, so a publish only busts the specific tags it actually affects.
- The two debounced invalidation queues (cache invalidation, search-index rebuild) are merged into one generic queue with consistent retry/backoff/dead-letter behavior.
- A search-index rebuild now only counts as failed (and retries) when building the index itself fails; notifying the frontend afterward goes through the same durable, retrying queue instead of a one-shot request.

### Fixed
- Fixed a leak where only the most recently queued duplicate invalidation event's persisted row was cleaned up after delivery, leaving the others in the table indefinitely.
- Fixed a startup race where concurrent mutations could each attempt to create the invalidation table at once.
- Fixed a retry-delay lookup that could produce `undefined` if invalidation delivery were ever configured to retry more than three times.

## [1.2.1] - 2026-06-05

### Fixed
- Backend build failed when shared contracts were imported from outside `dist/`; contracts are now synced into `src/shared/contracts` on prebuild, predev, and pretest (matching the frontend pattern).

## [1.2.0] - 2026-06-05

### Added
- Search index rebuild now queues on article, podcast, author, and category mutations (debounced), not only on the nightly cron.

### Changed
- Cache invalidation lifecycle hooks are generated from the shared invalidation manifest.
- Document middleware uses the shared `DOCUMENT_INVALIDATION` mapping for feed and about targets.
- Search index builder imports record types from the shared search schema contract.

## [1.1.6] - 2026-06-05

### Changed
- Updated Strapi and related packages (`@strapi/strapi`, `@strapi/utils`, `@strapi/plugin-users-permissions`, `@strapi/provider-email-mailgun`) to 5.47.0.

## [1.1.5] - 2026-06-02

### Changed
- Dependency maintenance: updated lockfile.

## [1.1.4] - 2026-05-29

### Added
- Vitest unit-test setup (`pnpm test` / `pnpm test:run`) with tests for word-count extraction, scheduled-publish cutoff logic, Next.js cache invalidation (retry/backoff), request-security helpers (constant-time secret comparison, rate limiting), audio-migration URL/MIME validation, file-path traversal guarding, and search-index metrics filtering. Test files are excluded from `strapi build`.
- Cross-package contract test ensuring the backend's cache-invalidation targets stay in sync with the frontend taxonomy.

### Changed
- Extracted pure, framework-free helpers out of the search-index controller, podcast duration middleware, audio-migration script, and search-index builder into dedicated modules (`requestSecurity`, `durationFile`, `audioMigrationUtils`, `metricsHistory`) to make them unit-testable. Behaviour is unchanged.

## [1.1.3] - 2026-05-16

### Changed
- Added `.npmrc` with supply-chain security settings: 7-day package quarantine, blocked exotic subdependency specifiers, and disabled lifecycle scripts

## [1.1.2] - 2026-04-30

### Changed
- Upgraded Strapi to 5.44 and removed unused admin dependencies (`@strapi/design-system`, `@radix-ui/react-tooltip`)
- Reordered admin content-manager layouts for articles and podcasts; dropped redundant `mainField` on YouTube relations
- Captured the admin homepage widget layout in config sync

## [1.1.1] - 2026-04-11

### Changed
- Search index now indexes up to 50,000 characters of article content (previously 5,000), enabling full-content search for most articles

## [1.1.0] - 2026-04-11

### Added
- Scheduled publishing of prepared entries
- SQL injection checks on content queries
- Exponential backoff with retry limit for search index rebuilds

### Fixed
- Database pool health warning now reads configured max instead of hardcoded value
- Cache invalidation log message accurately describes retry behaviour
- Improved error handling and logging across cache invalidation and word count processes

### Changed
- Updated dependencies (Strapi 5.42, marked 17.0.6, typescript 5.3.3)
- Refactored category handling and content structure schema
- Enhanced word count backfill process
