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

/**
 * `expire` sentinel for `cacheLife()` calls below — Next's own "no hard expiry"
 * value (`INFINITE_CACHE`), matching the old fetch-based `revalidate` model where
 * tag-based invalidation (not a time window) is what actually busts a cache entry.
 */
const CACHE_LIFE_NO_EXPIRE = 4294967294;

/**
 * `cacheLife()` argument for `'use cache'` functions backing individual content
 * pages (articles/podcasts/authors/categories) — mirrors CACHE_REVALIDATE_CONTENT_PAGE.
 *
 * Passed as a literal object rather than a custom named profile string: TypeScript 7's
 * overload resolution for `cacheLife(profile: string)` (the named-profile overload)
 * doesn't reliably narrow against `next.config.ts`'s registered profile names, while the
 * object-argument overload type-checks unambiguously.
 */
export const CACHE_LIFE_CONTENT_DETAIL = {
    stale: CACHE_REVALIDATE_CONTENT_PAGE,
    revalidate: CACHE_REVALIDATE_CONTENT_PAGE,
    expire: CACHE_LIFE_NO_EXPIRE,
};

/**
 * `cacheLife()` argument for `'use cache'` functions backing list/collection reads —
 * mirrors CACHE_REVALIDATE_DEFAULT. See CACHE_LIFE_CONTENT_DETAIL for why this is an
 * object literal rather than a named profile.
 */
export const CACHE_LIFE_CONTENT_LIST = {
    stale: CACHE_REVALIDATE_DEFAULT,
    revalidate: CACHE_REVALIDATE_DEFAULT,
    expire: CACHE_LIFE_NO_EXPIRE,
};

