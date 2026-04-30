# Changelog

All notable changes to this project will be documented in this file.

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
