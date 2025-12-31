---
name: Add explicit cache revalidate periods
overview: This plan implements explicit cache revalidation periods across the Next.js application by creating cache duration constants, updating all fetch functions to use revalidate periods alongside existing cache tags, and enhancing documentation and type safety.
todos:
  - id: create-cache-constants
    content: Create frontend/src/lib/cache/constants.ts with CACHE_REVALIDATE_DEFAULT, CACHE_REVALIDATE_CONTENT_PAGE, and CACHE_REVALIDATE_SEARCH constants
    status: completed
  - id: update-strapi-fetch
    content: Update fetchStrapiJson() in frontend/src/lib/strapi.ts to accept optional revalidate parameter and pass it to fetch next option
    status: completed
    dependencies:
      - create-cache-constants
  - id: update-search-index-fetch
    content: "Update loadSearchIndex() in frontend/app/api/search-index/route.ts to add revalidate: CACHE_REVALIDATE_SEARCH"
    status: completed
    dependencies:
      - create-cache-constants
  - id: update-feed-route-fetch
    content: Update fetchStrapiJson() in frontend/src/lib/rss/feedRoute.ts to accept optional revalidate parameter
    status: completed
    dependencies:
      - create-cache-constants
  - id: update-strapi-content-fetch-helper
    content: Update fetchJson() helper in frontend/src/lib/strapiContent.ts to accept and pass through revalidate parameter
    status: completed
    dependencies:
      - create-cache-constants
  - id: update-list-functions
    content: "Add revalidate: CACHE_REVALIDATE_DEFAULT to all list/collection functions in strapiContent.ts (fetchArticlesList, fetchPodcastsList, fetchAuthorsList, fetchCategoriesWithContent, fetchArticlesPage, fetchPodcastsPage, fetchArticlesBySlugs, fetchPodcastsBySlugs)"
    status: completed
    dependencies:
      - update-strapi-content-fetch-helper
  - id: update-detail-functions
    content: "Add revalidate: CACHE_REVALIDATE_CONTENT_PAGE to all detail page functions in strapiContent.ts (fetchArticleBySlug, fetchPodcastBySlug, fetchAuthorBySlug, fetchCategoryBySlug)"
    status: completed
    dependencies:
      - update-strapi-content-fetch-helper
  - id: update-legal-functions
    content: "Update getPrivacy(), getImprint(), and getAbout() in frontend/src/lib/strapi.ts to pass revalidate: CACHE_REVALIDATE_DEFAULT"
    status: completed
    dependencies:
      - update-strapi-fetch
  - id: create-cache-types
    content: Create frontend/src/lib/cache/types.ts with CacheOptions type definition
    status: completed
  - id: update-documentation
    content: Update frontend/CACHING.md to document explicit revalidate periods, cache constants, and combined tag/revalidate strategy
    status: completed
    dependencies:
      - create-cache-constants
---

# Add Explicit Cache Revalidation Periods

This plan implements explicit cache revalidation periods throughout the Next.js application to provide fallback cache expiration alongside the existing tag-based invalidation system.

## Architecture Overview

The implementation follows a three-phase approach:

1. **Foundation**: Create cache constants and extend base fetch utilities
2. **Application**: Add revalidate periods to all content fetching functions
3. **Validation**: Enhance documentation and add type safety

## Phase 1: Foundation

### Create Cache Constants

Create `frontend/src/lib/cache/constants.ts` with:

- `CACHE_REVALIDATE_DEFAULT = 3600` (1 hour) - Default cache duration for most content
- `CACHE_REVALIDATE_CONTENT_PAGE = 900` (15 minutes) - Shorter duration for individual content pages
- `CACHE_REVALIDATE_SEARCH = 3600` (1 hour) - Cache duration for search index

Each constant includes JSDoc comments explaining usage.

### Update Base Fetch Utilities

**File**: `frontend/src/lib/strapi.ts`Update `fetchStrapiJson()` function:

- Add optional `revalidate` parameter to `FetchStrapiOptions` interface
- Pass `revalidate` to fetch's `next` option alongside existing `tags`
- Update JSDoc documentation to mention revalidate parameter
- Maintain backward compatibility (revalidate is optional)

**File**: `frontend/app/api/search-index/route.ts`Update `loadSearchIndex()` function:

- Import `CACHE_REVALIDATE_SEARCH` from constants
- Add `revalidate: CACHE_REVALIDATE_SEARCH` to fetch options alongside existing `tags: ['search-index']`

**File**: `frontend/src/lib/rss/feedRoute.ts`Update `fetchStrapiJson()` function:

- Add optional `revalidate` parameter to `StrapiFetchArgs` type
- Pass `revalidate` to fetch's `next` option alongside existing `tags`
- Maintain backward compatibility

## Phase 2: Apply Revalidate Periods

### Update Content Fetching Functions

**File**: `frontend/src/lib/strapiContent.ts`All functions need to import `CACHE_REVALIDATE_DEFAULT` and `CACHE_REVALIDATE_CONTENT_PAGE` from constants.**List/Collection Functions** (use `CACHE_REVALIDATE_DEFAULT`):

- `fetchArticlesList()` - Add `revalidate: CACHE_REVALIDATE_DEFAULT` to `fetchJson()` call
- `fetchPodcastsList()` - Add `revalidate: CACHE_REVALIDATE_DEFAULT` to `fetchJson()` call
- `fetchAuthorsList()` - Add `revalidate: CACHE_REVALIDATE_DEFAULT` to `fetchJson()` call
- `fetchCategoriesWithContent()` - Add `revalidate: CACHE_REVALIDATE_DEFAULT` to `fetchJson()` call
- `fetchArticlesPage()` - Add `revalidate: CACHE_REVALIDATE_DEFAULT` to `fetchJson()` call
- `fetchPodcastsPage()` - Add `revalidate: CACHE_REVALIDATE_DEFAULT` to `fetchJson()` call
- `fetchArticlesBySlugs()` - Add `revalidate: CACHE_REVALIDATE_DEFAULT` to `fetchJson()` call
- `fetchPodcastsBySlugs()` - Add `revalidate: CACHE_REVALIDATE_DEFAULT` to `fetchJson()` call

**Detail Page Functions** (use `CACHE_REVALIDATE_CONTENT_PAGE`):

- `fetchArticleBySlug()` - Add `revalidate: CACHE_REVALIDATE_CONTENT_PAGE` to `fetchJson()` call
- `fetchPodcastBySlug()` - Add `revalidate: CACHE_REVALIDATE_CONTENT_PAGE` to `fetchJson()` call
- `fetchAuthorBySlug()` - Add `revalidate: CACHE_REVALIDATE_CONTENT_PAGE` to `fetchJson()` call
- `fetchCategoryBySlug()` - Add `revalidate: CACHE_REVALIDATE_CONTENT_PAGE` to `fetchJson()` call

**Note**: The `fetchJson()` helper function in `strapiContent.ts` needs to be updated to accept and pass through `revalidate` parameter.

### Update Legal/Static Page Functions

**File**: `frontend/src/lib/strapi.ts`Update these functions to pass `revalidate: CACHE_REVALIDATE_DEFAULT`:

- `getPrivacy()` - Pass revalidate through options to `getLegalDocWithFallback()`
- `getImprint()` - Pass revalidate through options to `getLegalDocWithFallback()`
- `getAbout()` - Pass revalidate through options to `getAboutWithFallback()`

These functions already accept `FetchStrapiOptions`, so they'll automatically support revalidate once `fetchStrapiJson()` is updated.

### Audit Remaining Fetch Calls

Check for any other fetch calls that might need cache configuration:

- `frontend/src/lib/swr/config.ts` - Client-side fetch, no cache config needed
- `frontend/src/lib/search/fuseClient.ts` - Client-side fetch, no cache config needed

## Phase 3: Documentation and Type Safety

### Update Documentation

**File**: `frontend/CACHING.md`Add new sections:

1. **Explicit Revalidate Periods**: Document that revalidate periods are now applied throughout the codebase as fallback to tag-based invalidation
2. **Cache Duration Constants**: Document the three constants and their usage patterns
3. **Combined Strategy**: Clarify how tags and revalidate work together (tags take precedence, revalidate is fallback)
4. **Implementation Examples**: Show examples of functions using both tags and revalidate
5. **Clarification**: Explicitly state that traditional Next.js fetch cache options are used, not the 'use cache' directive

Update existing sections:

- Update "Cache Duration" section to reflect explicit revalidate periods
- Update "Implementation Details" section to mention revalidate parameter

### Add TypeScript Types

**File**: `frontend/src/lib/cache/types.ts` (new file)Create type definitions:

- `CacheOptions` interface with `tags?: string[]` and `revalidate?: number`
- Export type for use in fetch utilities

**File**: `frontend/src/lib/strapi.ts`Update `FetchStrapiOptions` interface:

- Import `CacheOptions` type (or extend it)
- Ensure it includes both `tags` and `revalidate` properties

**File**: `frontend/src/lib/strapiContent.ts`Update `FetchOptions` type:

- Add `revalidate?: number` property
- Consider renaming to `CacheOptions` for consistency

## Implementation Notes

- All changes maintain backward compatibility (revalidate is optional)
- Existing cache tags remain intact - revalidate is additive
- The `fetchJson()` helper in `strapiContent.ts` needs to be updated to accept revalidate parameter
- Client-side fetches (SWR config, fuseClient) don't need server-side cache configuration
- The search-index route already has tags, just needs revalidate added

## Testing Considerations

- Verify that existing tag-based invalidation still works
- Confirm that revalidate periods are respected by Next.js cache