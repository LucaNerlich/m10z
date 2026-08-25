/**
 * The closed vocabulary of cache-relevant content-type keys.
 *
 * Lives in its own leaf module (no imports) so that both the tag builders in
 * `tags.ts` and the config map in `registry.ts` can depend on it without the
 * two forming an import cycle.
 */

export const CONTENT_TYPE_KEYS = [
    'article',
    'podcast',
    'author',
    'category',
    'article-feed',
    'audio-feed',
    'about',
    'about-feed',
    'imprint',
    'privacy',
    // Synthetic (non-Strapi-backed) types: never matched against a mutation by `uid`,
    // only ever constructed programmatically (by the search-index rebuild queue) to
    // reuse the same tag-computation path for a couple of flat, cross-cutting caches.
    'search-index',
    'sitemap',
] as const;

export type ContentTypeKey = (typeof CONTENT_TYPE_KEYS)[number];
