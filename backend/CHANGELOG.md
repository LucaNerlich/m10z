# Changelog

All notable changes to this project will be documented in this file.

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
