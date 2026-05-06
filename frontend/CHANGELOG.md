# Changelog

All notable changes to this project will be documented in this file.

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
