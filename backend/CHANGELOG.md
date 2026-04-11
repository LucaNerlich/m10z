# Changelog

All notable changes to this project will be documented in this file.

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
