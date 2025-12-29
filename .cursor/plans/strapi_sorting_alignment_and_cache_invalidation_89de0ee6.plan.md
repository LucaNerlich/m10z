---
name: Strapi sorting alignment and cache invalidation
overview: Align Strapi fetch sorting with display sorting by changing queries to sort by `base.date` instead of `publishedAt`, implement a fallback fetch buffer, and fix cache invalidation to ensure homepage refreshes when content is published.
todos:
  - id: update-articles-sort
    content: Update fetchArticlesPage() in strapiContent.ts to sort by 'base.date:desc' instead of 'publishedAt:desc'
    status: completed
  - id: update-podcasts-sort
    content: Update fetchPodcastsPage() in strapiContent.ts to sort by 'base.date:desc' instead of 'publishedAt:desc'
    status: completed
  - id: add-sorting-comments
    content: Add comments in page.tsx explaining that sortByDateDesc() calls are defensive sorting for potential Strapi sorting limitations
    status: completed
    dependencies:
      - update-articles-sort
      - update-podcasts-sort
  - id: update-fetch-count
    content: Update fetchCount calculation in page.tsx to use Math.max(100, ...) to ensure minimum 100-item buffer
    status: completed
  - id: add-buffer-comments
    content: Add comment block in page.tsx explaining publishedAt vs base.date sorting mismatch and why 100-item buffer is needed
    status: completed
    dependencies:
      - update-fetch-count
  - id: add-article-invalidation
    content: Add revalidateTag('page:home', 'max') call to article invalidation route
    status: completed
  - id: add-podcast-invalidation
    content: Add revalidateTag('page:home', 'max') call to podcast invalidation route
    status: completed
  - id: document-tagging-strategy
    content: Add code comments in invalidation routes documenting the dual-tagging strategy (content-specific tags + page:home tag)
    status: completed
    dependencies:
      - add-article-invalidation
      - add-podcast-invalidation
---

# Strapi Sorting Alignment and Cache Invalidation

## Overview

This plan addresses three related tasks to improve sorting consistency and cache invalidation:

1. Align Strapi fetch sorting with display sorting by using `base.date` instead of `publishedAt`
2. Implement fallback fetch buffer to compensate for potential sorting mismatch
3. Fix cache invalidation to ensure homepage refreshes when articles/podcasts are published

## Task 1: Align Strapi Fetch Sorting

### Changes to `frontend/src/lib/strapiContent.ts`

**Update `fetchArticlesPage()` (line 369):**

- Change `sort: ['publishedAt:desc']` to `sort: ['base.date:desc']`
- This aligns server-side sorting with client-side display logic that uses `getEffectiveDate()` which prioritizes `base.date` over `publishedAt`

**Update `fetchPodcastsPage()` (line 576):**

- Change `sort: ['publishedAt:desc']` to `sort: ['base.date:desc']`
- Same rationale as above

**Note:** Strapi's support for sorting by relation component fields (`base.date`) needs verification. If Strapi doesn't support this, it may fall back to default sorting or return unsorted results, which is why Task 2 implements a defensive buffer.

### Changes to `frontend/app/page.tsx`

**Evaluate `sortByDateDesc()` calls (lines 181-182):**

- Keep `sortByDateDesc()` calls as defensive sorting
- Add comment explaining that client-side sorting compensates for potential Strapi sorting limitations
- The function uses `getEffectiveDate()` which prioritizes `base.date` over `publishedAt`, ensuring correct ordering even if Strapi doesn't support relation field sorting

## Task 2: Implement Fallback Fetch Buffer

### Changes to `frontend/app/page.tsx`

**Update `fetchCount` calculation (line 169):**

- Current: `Math.min(PAGE_SIZE * requestedPage + PAGE_SIZE, 200)`
- New: `Math.min(Math.max(100, PAGE_SIZE * requestedPage + PAGE_SIZE), 200)`
- This ensures a minimum fetch of 100 items to provide coverage after client-side re-sorting

**Add comment block explaining the buffer:**

- Document the `publishedAt` vs `base.date` sorting mismatch
- Explain why the 100-item buffer is needed for coverage after re-sorting
- Note that this compensates for cases where Strapi cannot sort by relation component fields

## Task 3: Fix Cache Invalidation

### Changes to `frontend/app/api/article/invalidate/route.ts`

**Add `revalidateTag('page:home')` call (after line 45):**

- Add `revalidateTag('page:home', 'max')` alongside existing article tag invalidation
- The homepage (`page.tsx`) already uses tags `HOME_ARTICLE_TAGS` and `HOME_PODCAST_TAGS` which include `'page:home'`, so invalidating this tag will refresh the homepage cache

### Changes to `frontend/app/api/podcast/invalidate/route.ts`

**Add `revalidateTag('page:home')` call (after line 49):**

- Add `revalidateTag('page:home', 'max')` alongside existing podcast tag invalidation
- Same rationale as above

**Evaluate cache tagging strategy:**

- The current dual-tagging approach (`strapi:article`/`strapi:podcast` + `page:home`) provides value:
- Content-specific tags allow granular invalidation
- `page:home` tag allows homepage-specific invalidation
- This separation enables future optimizations (e.g., invalidating homepage without invalidating all article pages)
- Add code comments documenting this tagging strategy

## Implementation Notes

1. **Strapi Relation Field Sorting:** The plan assumes Strapi may or may not support sorting by `base.date`. The defensive client-side sorting and fetch buffer handle both scenarios.
2. **Sorting Logic:** `sortByDateDesc()` uses `getEffectiveDate()` which prioritizes `base.date` over `publishedAt`, matching the intended display order.
3. **Cache Tags:** The `page:home` tag is already used in `page.tsx` (lines 36-37), so adding invalidation for this tag will properly refresh the homepage cache.
4. **Testing Considerations:** After implementation, verify:

- Strapi accepts `base.date:desc` sorting (or falls back gracefully)
- Homepage cache invalidates correctly when articles/podcasts are published