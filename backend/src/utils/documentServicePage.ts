/**
 * Pagination helpers for `strapi.documents().findMany()`.
 *
 * Nested REST-style `pagination: {page, pageSize}` is accepted by Document
 * Service and then stripped. The query builder only honors flat `limit`/`start`
 * (or top-level `page`/`pageSize`). Passing the nested object silently returns
 * every match — which made the wordCount cron republish the whole catalog in
 * one nightly run (see #688).
 */

/**
 * Convert a 1-based page index into Document Service `limit`/`start`.
 */
export function documentServicePage(page: number, pageSize: number): {limit: number; start: number} {
    return {
        limit: pageSize,
        start: (page - 1) * pageSize,
    };
}
