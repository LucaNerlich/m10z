---
name: Migrate client-side fetching to SWR
overview: Migrate client-side data fetching from manual useEffect/fetch patterns to SWR for better caching, revalidation, error handling, and developer experience. This focuses on SearchModal and search index loading, while preserving the existing server-side fetching architecture.
todos:
  - id: install-swr
    content: Install SWR package in frontend/package.json
    status: completed
  - id: create-swr-config
    content: Create SWR configuration file (frontend/src/lib/swr/config.ts) with secure fetcher and global settings
    status: completed
    dependencies:
      - install-swr
  - id: create-swr-provider
    content: Create SWRProvider component (frontend/src/components/SWRProvider.tsx) wrapping SWRConfig
    status: completed
    dependencies:
      - create-swr-config
  - id: update-layout
    content: Wrap app with SWRProvider in frontend/app/layout.tsx
    status: completed
    dependencies:
      - create-swr-provider
  - id: create-search-index-hook
    content: Create useSearchIndex hook (frontend/src/hooks/useSearchIndex.ts) for fetching search index
    status: completed
    dependencies:
      - update-layout
  - id: create-search-query-hook
    content: Create useSearchQuery hook (frontend/src/hooks/useSearchQuery.ts) with debouncing for search queries
    status: completed
    dependencies:
      - create-search-index-hook
  - id: migrate-search-modal
    content: Refactor SearchModal component to use useSearchQuery hook, removing manual useEffect/fetch logic
    status: completed
    dependencies:
      - create-search-query-hook
  - id: refactor-fuse-client
    content: Optionally refactor fuseClient.ts to leverage SWR caching (or keep as-is if using hooks)
    status: completed
    dependencies:
      - create-search-index-hook
  - id: test-functionality
    content: Test search modal functionality, caching behavior, error handling, and accessibility
    status: completed
    dependencies:
      - migrate-search-modal
  - id: update-documentation
    content: Update CACHING.md and add inline documentation for SWR usage patterns
    status: completed
    dependencies:
      - test-functionality
---

# Migrate Client-Side Fetching to SWR

## Current State Analysis

**Server-Side Fetching (No Changes Needed):**

- Most data fetching happens in async Server Components using native `fetch` with Next.js cache tags
- Functions in `frontend/src/lib/strapi.ts` and `frontend/src/lib/strapiContent.ts` handle server-side fetching
- Comprehensive caching strategy documented in `frontend/CACHING.md`

**Client-Side Fetching (Migration Target):**

- `frontend/src/components/SearchModal.tsx`: Uses manual `useEffect` with debouncing, manual loading/error states, and no caching
- `frontend/src/lib/search/fuseClient.ts`: Loads search index via `fetch` without caching - reloads on every search

## Benefits of SWR Migration

1. **Automatic Caching**: Search index cached across component mounts/unmounts
2. **Request Deduplication**: Multiple components requesting same data share one request
3. **Background Revalidation**: Automatic stale-while-revalidate pattern
4. **Better Error Handling**: Built-in retry logic and error states
5. **Loading States**: Simplified loading state management
6. **Developer Experience**: Less boilerplate, more declarative code

## Implementation Plan

### Phase 1: Setup and Configuration

1. **Install SWR**

- Add `swr` to `frontend/package.json` dependencies
- Version: Latest stable (^2.x)

2. **Create SWR Configuration**

- Create `frontend/src/lib/swr/config.ts` with:
    - Default fetcher function that handles errors securely
    - Global SWR configuration (revalidateOnFocus, revalidateOnReconnect, etc.)
    - Error handling that doesn't expose sensitive information
- Create `frontend/src/components/SWRProvider.tsx` to wrap the app with SWRConfig

3. **Update App Layout**

- Wrap application in `SWRProvider` in `frontend/app/layout.tsx`
- Ensure SWRConfig respects security rules (no sensitive data in errors)

### Phase 2: Create Reusable SWR Hooks

1. **Search Index Hook**

- Create `frontend/src/hooks/useSearchIndex.ts`:
    - Uses SWR to fetch and cache `/api/search-index`
    - Returns search index data, loading state, and error
- Cache key: `['search-index']`

2. **Search Query Hook**

- Create `frontend/src/hooks/useSearchQuery.ts`:
    - Uses SWR to fetch search results from `/api/search-index?q=...`
    - Implements debouncing via SWR's `useSWR` with conditional fetching
- Cache key: `['search-index', query]` (only fetches when query length > 0)

### Phase 3: Migrate SearchModal Component

1. **Refactor SearchModal**

- Replace manual `useEffect` + `useState` pattern with `useSearchQuery` hook
- Remove manual debouncing logic (handle via SWR configuration)
- Simplify loading/error state management
- Keep existing keyboard navigation and accessibility features
- File: `frontend/src/components/SearchModal.tsx`

2. **Update fuseClient.ts**

- Option A: Keep as-is but use SWR hook in components
- Option B: Refactor to use SWR internally (recommended)
- Remove manual fetch calls, use SWR's caching instead
- File: `frontend/src/lib/search/fuseClient.ts`

### Phase 4: Testing and Validation

1. **Functional Testing**

- Verify search modal works identically to current implementation
- Test search index caching (should not reload on every search)
- Verify error handling and loading states
- Test keyboard navigation and accessibility

2. **Performance Testing**

- Verify search index is cached and not refetched unnecessarily
- Check that request deduplication works (multiple searches don't trigger multiple requests)
- Verify background revalidation doesn't cause UI flicker

3. **Security Validation**

- Ensure error messages don't expose sensitive information
- Verify no secrets are logged or exposed
- Confirm rate limiting still works correctly

### Phase 5: Documentation

1. **Update Documentation**

- Document SWR usage patterns in codebase
- Add examples for future client-side data fetching
- Update `frontend/CACHING.md` to mention client-side SWR caching

## Technical Considerations

### SWR Configuration

```typescript
// Example configuration structure
{
  revalidateOnFocus: false, // Don't refetch on window focus for search
  revalidateOnReconnect: true, // Refetch when network reconnects
  dedupingInterval: 2000, // Dedupe requests within 2s
  errorRetryCount: 3,
  errorRetryInterval: 5000,
}
```



### Security Considerations

- Error messages must not expose sensitive backend details
- Use secure fetcher that validates responses
- Maintain existing rate limiting on `/api/search-index`
- Ensure SWR doesn't bypass security headers

### Debouncing Strategy

- Option 1: Use SWR's `useSWR` with conditional key (only fetch when query ready)
- Option 2: Keep debouncing in component, use SWR for actual fetch
- Recommendation: Use conditional SWR key with debounced query value

### Cache Key Strategy

- Search index: `['search-index']` (full index)
- Search queries: `['search-index', query]` (query-specific results)
- Consider using `useSWRInfinite` if pagination is needed in future

## Files to Modify

1. `frontend/package.json` - Add SWR dependency
2. `frontend/app/layout.tsx` - Add SWRProvider wrapper
3. `frontend/src/lib/swr/config.ts` - New file: SWR configuration
4. `frontend/src/components/SWRProvider.tsx` - New file: SWR provider component
5. `frontend/src/hooks/useSearchIndex.ts` - New file: Search index hook
6. `frontend/src/hooks/useSearchQuery.ts` - New file: Search query hook
7. `frontend/src/components/SearchModal.tsx` - Refactor to use SWR hooks
8. `frontend/src/lib/search/fuseClient.ts` - Optionally refactor to use SWR
9. `frontend/CACHING.md` - Update documentation

## Migration Strategy

1. **Incremental Migration**: Migrate one component at a time
2. **Backward Compatibility**: Ensure existing functionality works during migration
3. **Feature Parity**: Maintain all existing features (keyboard nav, accessibility, etc.)
4. **Performance**: Ensure migration improves or maintains current performance

## Success Criteria

- SearchModal works identically to current implementation
- Search index is cached and not reloaded unnecessarily
- Error handling is secure and user-friendly
- Code is cleaner and more maintainable
- No performance regressions