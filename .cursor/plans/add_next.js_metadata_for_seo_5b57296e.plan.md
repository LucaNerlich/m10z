---
name: Add Next.js Metadata for SEO
overview: Add comprehensive Next.js metadata exports to all pages for SEO optimization, including static metadata for listing/legal pages and dynamic generateMetadata functions for detail pages that fetch content from Strapi.
todos:
  - id: metadata-foundation
    content: "Create metadata foundation: types.ts with AuthorMetadata and ContentMetadata interfaces, formatters.ts with formatOpenGraphImage() function, and update layout.tsx with default site metadata"
    status: completed
  - id: static-metadata
    content: Add static metadata exports to datenschutz, impressum, page.tsx, artikel/page.tsx, podcasts/page.tsx, and kategorien/page.tsx
    status: completed
    dependencies:
      - metadata-foundation
  - id: fetch-category
    content: Add fetchCategoryBySlug function to strapiContent.ts for category detail page metadata
    status: completed
  - id: dynamic-article-metadata
    content: Add generateMetadata function to artikel/[slug]/page.tsx with article-specific metadata including OG images and Twitter cards
    status: completed
    dependencies:
      - metadata-foundation
  - id: dynamic-podcast-metadata
    content: Add generateMetadata function to podcasts/[slug]/page.tsx with episode-specific metadata including audio-specific OG metadata
    status: completed
    dependencies:
      - metadata-foundation
  - id: dynamic-category-metadata
    content: Add generateMetadata function to kategorien/[slug]/page.tsx with category-specific metadata
    status: completed
    dependencies:
      - fetch-category
      - metadata-foundation
  - id: dynamic-author-metadata
    content: Add generateMetadata function to team/[slug]/page.tsx with author profile metadata including avatar images
    status: completed
    dependencies:
      - metadata-foundation
---

# Add Next.js Metadata for SEO Optimization

## Overview

Implement Next.js metadata exports across all 11 pages in the frontend application. Create reusable metadata utilities and add static metadata to listing/legal pages, plus dynamic `generateMetadata` functions for detail pages that fetch content from Strapi.

## Architecture

The implementation follows Next.js App Router metadata patterns:

- **Foundation layer**: Type definitions and formatter utilities for consistent metadata generation
- **Root layout**: Default site-wide metadata with template
- **Static pages**: Export static `metadata` objects for pages with fixed content
- **Dynamic pages**: Export async `generateMetadata` functions that fetch content from Strapi

## Implementation Tasks

### Task 1: Create Metadata Foundation

**1.1 Create `frontend/src/lib/metadata/types.ts`**

- Define `AuthorMetadata` interface with name, description, avatar image URL
- Define `ContentMetadata` interface with title, description, cover image URL, published date
- Export types for reuse across metadata generation

**1.2 Create `frontend/src/lib/metadata/formatters.ts`**

- Implement `formatOpenGraphImage()` function that:
- Accepts `StrapiMedia` object (or undefined)
- Uses `mediaUrlToAbsolute()` from `rss/media.ts` to convert to absolute URL
- Returns Next.js `Image` metadata object with:
    - `url`: absolute image URL
    - `alt`: from `alternativeText` or `caption` or fallback
    - `width`/`height`: from media object if available
- Returns `undefined` if no valid media provided

**1.3 Update `frontend/app/layout.tsx`**

- Export static `metadata` object with:
- `title.template`: `"%s | Mindestens 10 Zeichen"`
- `title.default`: `"Mindestens 10 Zeichen"`
- `description`: Site description about gaming content and community
- `viewport`: Standard responsive viewport settings
- `themeColor`: Site theme color
- `robots`: Default indexing configuration
- `openGraph`: Default OG metadata with site name, locale "de", type "website", site URL
- `twitter`: Default Twitter Card metadata
- Keep existing JSON-LD script injection unchanged

### Task 2: Add Static Metadata to Listing/Legal Pages

**2.1 Update `frontend/app/datenschutz/page.tsx`**

- Export static `metadata` object:
- `title`: `"Datenschutz"`
- `description`: German privacy policy description
- `robots.index`: `true`
- `alternates.canonical`: `absoluteRoute('/datenschutz')`

**2.2 Update `frontend/app/impressum/page.tsx`**

- Export static `metadata` object:
- `title`: `"Impressum"`
- `description`: German legal information description
- `robots.index`: `true`
- `alternates.canonical`: `absoluteRoute('/impressum')`

**2.3 Update `frontend/app/page.tsx`**

- Export static `metadata` object:
- `title`: `undefined` (uses default from layout)
- `description`: Site description about organizational culture and HR topics
- `openGraph`: Include site-wide default image (`/images/m10z.jpg`)
- `alternates.canonical`: `absoluteRoute('/')`

**2.4 Update `frontend/app/artikel/page.tsx`**

- Export static `metadata` object:
- `title`: `"Artikel"`
- `description`: German description about article content
- `alternates.canonical`: `absoluteRoute('/artikel')`

**2.5 Update `frontend/app/podcasts/page.tsx`**

- Export static `metadata` object:
- `title`: `"Podcasts"`
- `description`: German description about podcast episodes
- `alternates.canonical`: `absoluteRoute('/podcasts')`

**2.6 Update `frontend/app/kategorien/page.tsx`**

- Export static `metadata` object:
- `title`: `"Kategorien"`
- `description`: German description about browsing by category
- `alternates.canonical`: `absoluteRoute('/kategorien')`

### Task 3: Add Dynamic Metadata to Detail Pages

**3.1 Add `fetchCategoryBySlug` to `frontend/src/lib/strapiContent.ts`**

- Implement function similar to `fetchAuthorBySlug`:
- Accepts slug string
- Queries `/api/categories` with slug filter
- Populates `base` with cover/banner, fields for title/description
- Returns `StrapiCategoryWithContent | null`
- Uses cache directive and appropriate tags

**3.2 Update `frontend/app/artikel/[slug]/page.tsx`**

- Export async `generateMetadata` function:
- Accepts `{ params: Promise<{ slug: string }> }`
- Validates slug using `validateSlugSafe()`
- Returns `notFound()` if slug invalid
- Fetches article via `fetchArticleBySlug(slug)`
- Returns `notFound()` if article doesn't exist
- Returns metadata object with:
    - `title`: Article title
    - `description`: Article description or truncated content
    - `alternates.canonical`: `absoluteRoute('/artikel/' + slug)`
    - `openGraph`: Type "article", title, description, images (via formatter), publishedTime/modifiedTime from `publishedAt`
    - `twitter`: Card type "summary_large_image", title, description, images
    - `authors`: Array of author names from `article.authors`
    - `publishedTime`: ISO date from `getEffectiveDate(article)`

**3.3 Update `frontend/app/podcasts/[slug]/page.tsx`**

- Export async `generateMetadata` function:
- Validates slug and fetches via `fetchPodcastBySlug(slug)`
- Returns `notFound()` for invalid/missing episodes
- Returns metadata object with:
    - `title`: Episode title
    - `description`: Episode description or shownotes preview
    - `alternates.canonical`: `absoluteRoute('/podcasts/' + slug)`
    - `openGraph`: Type "music.song" (or "article" as fallback), title, description, images (via formatter), audio metadata if available
    - `twitter`: Card type "summary_large_image" or "player" if audio URL available
    - `publishedTime`: ISO date from `getEffectiveDate(episode)`

**3.4 Update `frontend/app/kategorien/[slug]/page.tsx`**

- Export async `generateMetadata` function:
- Validates slug and fetches via `fetchCategoryBySlug(slug)` (new function)
- Returns `notFound()` for invalid categories
- Returns metadata object with:
    - `title`: Category title
    - `description`: Category description from `category.base.description`
    - `alternates.canonical`: `absoluteRoute('/kategorien/' + slug)`
    - `openGraph`: Type "website", title, description, images (category cover via formatter or fallback to default)
    - `robots`: Indexing configuration

**3.5 Update `frontend/app/team/[slug]/page.tsx`**

- Export async `generateMetadata` function:
- Validates slug and fetches via `fetchAuthorBySlug(slug)`
- Returns `notFound()` for invalid authors
- Returns metadata object with:
    - `title`: Author name/title
    - `description`: Author bio/description
    - `alternates.canonical`: `absoluteRoute('/team/' + slug)`
    - `openGraph`: Type "profile", title, description, images (avatar via formatter), profile metadata
    - `twitter`: Card type "summary", handle if available
    - Consider adding structured person metadata (can leverage existing JSON-LD patterns)

## Key Implementation Details

- All metadata functions follow existing error handling patterns (slug validation, `notFound()` calls)
- Use `absoluteRoute()` from `routes.ts` for canonical URLs
- Use `mediaUrlToAbsolute()` from `rss/media.ts` via formatter utility
- Use `getEffectiveDate()` for published dates
- Follow German language conventions for descriptions
- Maintain consistency with existing JSON-LD patterns
- All dynamic metadata functions use `'use cache'` directive for performance

## Files to Create

- `frontend/src/lib/metadata/types.ts`
- `frontend/src/lib/metadata/formatters.ts`

## Files to Modify

- `frontend/app/layout.tsx`
- `frontend/app/page.tsx`
- `frontend/app/datenschutz/page.tsx`
- `frontend/app/impressum/page.tsx`
- `frontend/app/artikel/page.tsx`
- `frontend/app/artikel/[slug]/page.tsx`
- `frontend/app/podcasts/page.tsx`
- `frontend/app/podcasts/[slug]/page.tsx`