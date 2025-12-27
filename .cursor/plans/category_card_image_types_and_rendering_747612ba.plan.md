---
name: Category Card Image Types and Rendering
overview: Update TypeScript types for category media fields and implement image rendering in CategoryCard component using ContentImage, matching the pattern from ArticleCard and PodcastCard.
todos:
  - id: update-strapi-content-types
    content: Re-export StrapiMediaRef in strapiContent.ts and update StrapiCategoryWithContent type to use StrapiMediaRef | null for cover and banner fields
    status: completed
  - id: update-category-card-types
    content: Update CategoryCardCategory type in CategoryCard.tsx to use StrapiMediaRef | null for cover and banner fields
    status: completed
  - id: add-image-imports
    content: Add imports for ContentImage, image utilities (normalizeStrapiMedia, getOptimalMediaFormat, mediaUrlToAbsolute), and placeholderCover to CategoryCard.tsx
    status: completed
  - id: extract-cover-image-data
    content: "Implement image data extraction logic: normalize cover media, get optimal format, and convert to absolute URL"
    status: completed
  - id: render-content-image
    content: Add ContentImage component rendering at top of card with proper props (src, alt, width, height, placeholder, blurhash) and wrap in link
    status: completed
  - id: update-category-card-css
    content: Add .media and .mediaLink styles to CategoryCard.module.css and update .card styles to match ContentCard structure
    status: completed
---

# Category Card Image Types and Rendering

## Overview

This plan updates TypeScript type definitions for category media fields and implements image rendering in the CategoryCard component, following the pattern established in ArticleCard and PodcastCard.

## Task 1: Update TypeScript Type Definitions

### Files to modify:

- [frontend/src/lib/strapiContent.ts](frontend/src/lib/strapiContent.ts)
- [frontend/src/components/CategoryCard.tsx](frontend/src/components/CategoryCard.tsx)

### Changes:

1. **In `frontend/src/lib/strapiContent.ts`:**

- Import `StrapiMediaRef` from `@/src/lib/rss/media` and re-export it for convenience
- Update `StrapiCategoryWithContent` type (lines 188-207): Change `cover?: unknown` and `banner?: unknown` to `cover?: StrapiMediaRef | null` and `banner?: StrapiMediaRef | null`

2. **In `frontend/src/components/CategoryCard.tsx`:**

- Import `StrapiMediaRef` type from `@/src/lib/strapiContent.ts`
- Update `CategoryCardCategory` type (lines 6-14): Change `cover?: unknown` and `banner?: unknown` to `cover?: StrapiMediaRef | null` and `banner?: StrapiMediaRef | null`

## Task 2: Implement Image Rendering

### Files to modify:

- [frontend/src/components/CategoryCard.tsx](frontend/src/components/CategoryCard.tsx)
- [frontend/src/components/CategoryCard.module.css](frontend/src/components/CategoryCard.module.css)

### Changes:

1. **In `frontend/src/components/CategoryCard.tsx`:**

- Import `ContentImage` from `@/src/components/ContentImage`
- Import image utilities: `normalizeStrapiMedia`, `getOptimalMediaFormat`, `mediaUrlToAbsolute` from `@/src/lib/rss/media`
- Import `placeholderCover` from `@/public/images/m10z.jpg` (same as ArticleCard/PodcastCard)
- Extract cover image data:
    - Normalize `category.base?.cover` using `normalizeStrapiMedia`
    - Get optimal format using `getOptimalMediaFormat(coverMedia, 'medium')`
    - Convert to absolute URL using `mediaUrlToAbsolute`
- Render `ContentImage` component:
    - Position at the top of the card (before `cardBody` div)
    - Use extracted image URL or fallback to `placeholderCover`
    - Set `width` and `height` from optimized media (default to 400x225 if missing)
    - Set `placeholder={blurhash ? 'blur' : 'empty'}`
    - Set `blurhash={category.base?.cover?.blurhash ?? undefined}`
    - Set `alt` to `category.base?.cover?.alternativeText ?? title`
- Wrap image in a link to category URL (matching ArticleCard/PodcastCard pattern)

2. **In `frontend/src/components/CategoryCard.module.css`:**

- Add `.media` wrapper styles matching `ContentCard.module.css`:
    - `position: relative`
    - `width: 100%`
    - `aspect-ratio: 16 / 9`
    - `overflow: hidden`
    - `background: var(--color-surface-strong)`
- Add `.mediaLink` style for the image link wrapper
- Update `.card` to use `overflow: hidden` and `flex-direction: column` (matching ContentCard structure)
- Ensure proper spacing between media and cardBody

### Implementation Notes:

- Follow the exact pattern from ArticleCard/PodcastCard for image extraction and rendering
- Use the same default dimensions (400x225) and placeholder image
- Ensure graceful fallback when cover image is missing
- Maintain responsive behavior consistent with other card components
- The ContentImage component will handle the image rendering with proper blurhash support