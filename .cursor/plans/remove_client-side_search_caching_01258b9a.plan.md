---
name: Remove client-side search caching
overview: Remove all client-side TTL-based caching from the search module and rely solely on browser HTTP caching. The API route already returns Cache-Control headers with max-age=60, so we'll simplify the client code to use default browser caching behavior.
todos: []
---

# Remove Client-Side Search Caching and Rely on HTTP Caching

## Overview

Remove all client-side TTL-based caching logic from `frontend/src/lib/search/fuseClient.ts` and rely exclusively on browser HTTP caching. The API route (`frontend/app/api/search-index/route.ts`) already returns `Cache-Control: public, max-age=60` headers for full index requests, which provides the necessary caching behavior.

## Implementation Tasks

### Task 1: Refactor fuseClient.ts

**File:** `frontend/src/lib/search/fuseClient.ts`

1. **Remove caching constants and state:**

- Delete `CACHE_TTL_MS` constant (line 8)
- Delete `fusePromise` module-level variable (line 12)
- Delete `lastFetchTime` module-level variable (line 13)

2. **Simplify `loadIndex()` function:**

- Remove `cache: 'force-cache'` option from fetch call (line 16)
- Use default browser caching behavior (browser will respect HTTP Cache-Control headers)

3. **Refactor `getFuse()` function:**

- Remove all TTL expiration checks (lines 40-47)
- Remove promise caching logic (lines 49-67)
- Simplify to directly fetch index and build Fuse instance on each call
- Remove development console.debug statements related to caching

4. **Delete cache management functions:**

- Remove `resetSearchCache()` function (lines 84-86)
- Remove `invalidateFuseCache()` function (lines 92-95)

5. **Update `searchIndex()` function:**

- Keep the function signature unchanged
- It will now call the simplified `getFuse()` which fetches fresh data (or uses browser cache)

### Task 2: Verify API Route Cache Headers

**File:** `frontend/app/api/search-index/route.ts`

- Confirm that line 209 returns `'Cache-Control': 'public, max-age=60'` for full index requests (no query parameter)
- This header is already present and correct - no changes needed

### Task 3: Testing and Validation

1. **Test SearchModal component:**

- Verify 150ms debounce still works correctly (line 107 in SearchModal.tsx)
- Test that search queries trigger API calls as expected
- Confirm search results display correctly

2. **Verify HTTP caching behavior:**

- Open browser DevTools Network tab
- Perform a search query
- Repeat the same search within 60 seconds
- Verify second request shows "(from disk cache)" or "(from memory cache)" in Chrome, or similar indicator in other browsers
- Test across Chrome, Firefox, and Safari to ensure consistent behavior

3. **Validate content freshness:**

- Test that new backend content appears in search within 60 seconds maximum
- Verify ISR cache invalidation works with backend updates (the route uses `next: {revalidate: 3600, tags: ['search-index']}` for server-side caching)

## Technical Details

### Current Flow (Before)

```javascript
SearchModal → searchIndex() → getFuse() → checks TTL → returns cached promise OR fetches → loadIndex() with force-cache → builds Fuse
```



### New Flow (After)

```javascript
SearchModal → searchIndex() → getFuse() → loadIndex() → browser HTTP cache (respects max-age=60) → builds Fuse
```



### Benefits

- Simpler code with less state management
- Browser handles caching automatically based on HTTP headers
- Consistent caching behavior across all browsers
- No client-side TTL logic to maintain
- Maximum 60-second staleness window (as per HTTP cache headers)

## Notes