/**
 * Type definitions for cache configuration options used throughout the application.
 */

/**
 * Cache configuration options for Next.js fetch requests.
 *
 * This type defines the structure for cache-related options that can be passed
 * to fetch functions. Both tags and revalidate work together:
 *
 * - `tags`: Used for tag-based cache invalidation (takes precedence)
 * - `revalidate`: Time-based cache expiration fallback (in seconds)
 *
 * @example
 * ```typescript
 * const options: CacheOptions = {
 *   tags: ['strapi:article', 'strapi:article:list'],
 *   revalidate: 3600
 * };
 * ```
 */
export interface CacheOptions {
    /**
     * Cache tags for tag-based invalidation.
     * Tags allow selective cache invalidation using `revalidateTag()`.
     */
    tags?: string[];

    /**
     * Cache revalidation period in seconds.
     * Defines how long the cache should be considered fresh before revalidating.
     * This serves as a fallback when tag-based invalidation doesn't occur.
     */
    revalidate?: number;
}

