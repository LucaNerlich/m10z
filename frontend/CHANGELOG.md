# Changelog

All notable changes to this project will be documented in this file.

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
