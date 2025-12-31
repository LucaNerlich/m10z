/**
 * Cache revalidation duration constants for Next.js fetch requests.
 *
 * These constants define explicit revalidation periods that serve as fallback
 * cache expiration times alongside tag-based invalidation. Tag-based invalidation
 * takes precedence, but revalidate periods ensure caches refresh periodically
 * even if tag invalidation doesn't occur.
 */

/**
 * Default cache revalidation period for most content.
 *
 * Used for:
 * - List/collection pages (articles, podcasts, authors, categories)
 * - Legal/static pages (privacy, imprint, about)
 * - RSS feeds
 *
 * Duration: 3600 seconds (1 hour)
 */
export const CACHE_REVALIDATE_DEFAULT = 3600;

/**
 * Cache revalidation period for individual content pages.
 *
 * Used for:
 * - Individual article pages
 * - Individual podcast pages
 * - Individual author pages
 * - Individual category pages
 *
 * Shorter duration ensures more frequent updates for detail pages while
 * tag-based invalidation handles immediate updates when content changes.
 *
 * Duration: 900 seconds (15 minutes)
 */
export const CACHE_REVALIDATE_CONTENT_PAGE = 900;

/**
 * Cache revalidation period for search index.
 *
 * Used for:
 * - Search index API endpoint
 *
 * Duration: 3600 seconds (1 hour)
 */
export const CACHE_REVALIDATE_SEARCH = 3600;

