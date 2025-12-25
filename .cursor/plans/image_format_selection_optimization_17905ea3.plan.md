---
name: Image Format Selection Optimization
overview: Implement image format selection helper function and update all image rendering across the application to use optimal formats based on display size requirements, improving performance and reducing bandwidth usage.
todos:
  - id: create-image-size-type
    content: Export ImageSize type and define IMAGE_SIZES_ORDERED constant in media.ts
    status: completed
  - id: implement-get-optimal-format
    content: Implement getOptimalMediaFormat function with fallback logic in media.ts
    status: completed
    dependencies:
      - create-image-size-type
  - id: update-team-slug-page
    content: Update team/[slug]/page.tsx to use getOptimalMediaFormat with 'thumbnail' size
    status: completed
    dependencies:
      - implement-get-optimal-format
  - id: update-team-list-page
    content: Update team/page.tsx to use getOptimalMediaFormat with 'thumbnail' size
    status: completed
    dependencies:
      - implement-get-optimal-format
  - id: update-search-types
    content: Update SearchRecord type to include coverImage as StrapiMediaRef (if Option A)
    status: completed
  - id: update-search-index-builder
    content: Update searchIndexBuilder.ts to populate media objects with formats (if Option A)
    status: completed
    dependencies:
      - update-search-types
  - id: update-search-modal
    content: Update SearchModal.tsx to use getOptimalMediaFormat with 'thumbnail' or 'small' size
    status: completed
    dependencies:
      - implement-get-optimal-format
      - update-search-types
  - id: optimize-article-cover
    content: Optimize cover images in artikel/[slug]/page.tsx using 'small' or 'medium' for inline display
    status: completed
    dependencies:
      - implement-get-optimal-format
  - id: optimize-podcast-cover
    content: Optimize cover images in podcasts/[slug]/page.tsx using 'small' or 'medium' for inline display
    status: completed
    dependencies:
      - implement-get-optimal-format
---

# Image Format Selection Optimization

## Overview

This plan implements a centralized image format selection system that automatically chooses the optimal image size from Strapi's responsive format variants (`thumbnail`, `small`, `medium`, `large`) based on display requirements, with intelligent fallback to larger sizes when the requested format is unavailable.

## Implementation Details

### Task 1: Create Image Format Selection Helper

**File: `frontend/src/lib/rss/media.ts`**

- Export `ImageSize` type as union: `'thumbnail' | 'small' | 'medium' | 'large'`
- Define internal constant array `IMAGE_SIZES_ORDERED` = `['thumbnail', 'small', 'medium', 'large']` for fallback logic
- Implement `getOptimalMediaFormat(media: StrapiMedia | null | undefined, requestedSize: ImageSize): StrapiMedia`:
- Returns empty `StrapiMedia` object `{}` if input is null/undefined
- Searches `media.formats[requestedSize]` for exact match
- Falls back to next larger size in ordered array if requested size unavailable
- Merges format properties (`url`, `width`, `height`, `ext`, `hash`, `mime`, `size`, `sizeInBytes`) with root metadata (`id`, `documentId`, `name`, `alternativeText`, `caption`)
- Excludes `formats` property from returned object
- Returns original media (without formats) if no matching format found

### Task 2: Update Team Pages

**Files:**

- `frontend/app/team/[slug]/page.tsx`
- `frontend/app/team/page.tsx`
- Import `getOptimalMediaFormat` from `@/src/lib/rss/media`
- Replace `normalizeStrapiMedia(author.avatar)` with `getOptimalMediaFormat(author.avatar, 'thumbnail')`
- Keep `mediaUrlToAbsolute()` usage with the result
- Ensure `Image` component receives proper `width`/`height` from selected format (use format dimensions when available, fallback to display dimensions)

**Note:** `frontend/app/team/page.tsx` currently manually accesses `avatar.formats?.small?.url` - this will be replaced by the helper.

### Task 3: Update SearchModal

**File: `frontend/src/components/SearchModal.tsx`Challenge:** `SearchRecord.coverImageUrl` is currently a URL string, but `getOptimalMediaFormat` requires a `StrapiMedia` object. Two options:**Option A (Recommended):** Update search index to include `StrapiMedia` objects

- Modify `backend/src/services/searchIndexBuilder.ts` to store media objects instead of URLs
- Update `frontend/src/lib/search/types.ts` to change `coverImageUrl?: string | null` to `coverImage?: StrapiMediaRef | null`
- Update SearchModal to use `getOptimalMediaFormat(normalizeStrapiMedia(item.coverImage), 'thumbnail')` or `'small'`
- Remove `normalizeImageUrl` function

**Option B (Simpler, less optimal):** Keep URL strings but optimize differently

- Keep current structure, use `normalizeImageUrl` for URL normalization
- Note: Cannot use `getOptimalMediaFormat` without media objects

**Recommendation:** Implement Option A for full optimization benefits. This requires updating the search index builder to populate media objects with formats.

### Task 4: Optimize Cover Images in Article and Podcast Pages

**Files:**

- `frontend/app/artikel/[slug]/page.tsx`
- `frontend/app/podcasts/[slug]/page.tsx`
- Import `getOptimalMediaFormat`
- For metadata (OpenGraph/Twitter): Continue using full resolution via `normalizeStrapiMedia(coverMedia)` (no format selection)
- For inline display (if cover images are rendered in-page): Use `getOptimalMediaFormat(coverMedia, 'small')` or `'medium'` depending on display size
- If cover images are not currently rendered inline, add them using optimized format
- For podcast episodes: Optimize episode thumbnails if present using `getOptimalMediaFormat` with appropriate size

## Technical Considerations

1. **Fallback Logic:** The helper will search formats in order: requested size → next larger sizes until found → original media if none found
2. **Type Safety:** `ImageSize` type ensures only valid format names are used
3. **Backward Compatibility:** Function handles null/undefined gracefully, maintaining existing behavior
4. **Format Merging:** Format-specific properties override root properties when format is selected
5. **Search Index:** Option A requires rebuilding search index to include full media objects with formats populated

## Files to Modify

1. `frontend/src/lib/rss/media.ts` - Add `ImageSize` type and `getOptimalMediaFormat` function
2. `frontend/app/team/[slug]/page.tsx` - Update avatar rendering
3. `frontend/app/team/page.tsx` - Update avatar rendering
4. `frontend/src/components/SearchModal.tsx` - Update image handling
5. `frontend/app/artikel/[slug]/page.tsx` - Optimize cover images
6. `frontend/app/podcasts/[slug]/page.tsx` - Optimize cover images
7. `backend/src/services/searchIndexBuilder.ts` - (If Option A) Update to include media objects
8. `frontend/src/lib/search/types.ts` - (If Option A) Update type definition

## Testing Considerations

- Verify format selection works for all size variants
- Test fallback behavior when requested format unavailable
- Ensure metadata still uses full resolution images
- Verify search modal images display correctly with new structure