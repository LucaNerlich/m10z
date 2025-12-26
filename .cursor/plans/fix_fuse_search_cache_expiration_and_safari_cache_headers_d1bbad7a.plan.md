---
name: Fix Fuse search cache expiration and Safari cache headers
overview: Add client-side cache expiration (10-minute TTL) to Fuse search instance, update HTTP cache headers for Safari compatibility, and add development logging to verify cache invalidation behavior.
todos:
  - id: add-client-cache-expiration
    content: Add lastFetchTime tracking and CACHE_TTL_MS constant to fuseClient.ts, update getFuse() to check expiration and reset cache when expired
    status: completed
  - id: add-invalidate-function
    content: Add invalidateFuseCache() function that resets both fusePromise and lastFetchTime
    status: completed
    dependencies:
      - add-client-cache-expiration
  - id: update-http-cache-headers
    content: "Update cache headers in route.ts: no-store for queries, max-age=60 for full index, add Expires:0 and Pragma headers for Safari"
    status: completed
  - id: add-safari-documentation
    content: Add comment block documenting Safari-specific caching decisions and rationale
    status: completed
    dependencies:
      - update-http-cache-headers
  - id: add-dev-logging
    content: Add development-only console.debug statements for cache expiration, new fetches, and cache hits in fuseClient.ts
    status: completed
    dependencies:
      - add-client-cache-expiration
  - id: review-invalidation
    content: Review invalidate/route.ts implementation and verify revalidateTag works with new cache headers
    status: completed
    dependencies:
      - update-http-cache-headers
---

# Fix Fuse Search Cache Expiration and Safari Cache Headers

## Overview

This plan addresses three related issues:

1. **Client-side cache expiration**: The Fuse search instance is cached indefinitely without expiration
2. **Safari cache compatibility**: HTTP cache headers need adjustment for Safari's caching behavior
3. **Development visibility**: Add logging to verify cache invalidation works correctly

## Implementation Details

### Task 1: Client-Side Cache Expiration

**File**: [`frontend/src/lib/search/fuseClient.ts`](frontend/src/lib/search/fuseClient.ts)

- Add `lastFetchTime: number | null = null` to track when the index was last fetched
- Add `CACHE_TTL_MS = 600000` constant (10 minutes)
- Update `getFuse()` function:
- Check if `lastFetchTime` exists and if cache has expired (`Date.now() - lastFetchTime > CACHE_TTL_MS`)
- If expired, reset `fusePromise = null` and `lastFetchTime = null`
- Set `lastFetchTime = Date.now()` when creating a new `fusePromise` (before `loadIndex()` call)
- Add `invalidateFuseCache()` function that resets both `fusePromise = null` and `lastFetchTime = null`
- Keep existing `resetSearchCache()` function for backward compatibility (it only resets `fusePromise`)
- Preserve existing error handling that resets `fusePromise` on error

### Task 2: Safari-Compatible HTTP Cache Headers

**File**: [`frontend/app/api/search-index/route.ts`](frontend/app/api/search-index/route.ts)

- **For search queries** (`?q=` parameter present):
- Set `Cache-Control: no-store, no-cache`
- Add `Pragma: no-cache` header
- Add `Expires: 0` header for older Safari versions
- **For full index requests** (no `q` parameter):
- Change from `Cache-Control: public, max-age=300, stale-while-revalidate=600`
- To `Cache-Control: public, max-age=60` (1 minute, no stale-while-revalidate)
- Add `Expires: 0` header for older Safari versions
- Keep existing ISR config (`next: {revalidate: 3600, tags: ['search-index']}`) unchanged
- Add comment block before the `GET` function documenting:
- Safari-specific caching decisions
- Rationale for different cache headers for queries vs full index
- Why `Expires: 0` is included for older Safari versions

### Task 3: Development Logging and Verification

**File**: [`frontend/src/lib/search/fuseClient.ts`](frontend/src/lib/search/fuseClient.ts)

- Add development-only `console.debug` statements:
- When cache expires: log cache expiration event
- When new fetch begins: log that a new fetch is starting
- When cache hit occurs: log that cached instance is being used
- Gate all logging with `process.env.NODE_ENV === 'development'`

**File**: [`frontend/app/api/search-index/invalidate/route.ts`](frontend/app/api/search-index/invalidate/route.ts)

- Review existing implementation (no changes expected)
- Verify that `revalidateTag('search-index', 'max')` works correctly with new cache headers
- Note that client-side TTL acts as fallback even if HTTP cache headers are bypassed

## Architecture Flow

```javascript
Client Request → getFuse()
  ├─ Cache expired? → Reset cache → Fetch new index → Set lastFetchTime
  ├─ Cache valid? → Return cached fusePromise
  └─ Error? → Reset cache → Throw error

API Request → GET /api/search-index
  ├─ Has ?q= param? → no-store headers → Perform search → Return results
  └─ No ?q= param? → max-age=60 headers → Return full index

Invalidation → POST /api/search-index/invalidate
  └─ revalidateTag('search-index') → Next.js ISR revalidation
```



## Testing Considerations

- Verify cache expires after 10 minutes in development
- Test that search queries bypass HTTP cache
- Test that full index requests respect 1-minute cache
- Verify invalidation endpoint triggers cache refresh