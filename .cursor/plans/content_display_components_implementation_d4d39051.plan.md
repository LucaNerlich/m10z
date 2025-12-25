---
name: Content Display Components Implementation
overview: Build foundational utilities and reusable card components for displaying articles, podcasts, authors, and categories in a responsive grid layout with German date formatting and text truncation support.
todos:
  - id: text-utils
    content: Create textUtils.ts with CSS line-clamp helper functions
    status: completed
  - id: date-formatters
    content: Create dateFormatters.ts with German locale date formatting functions
    status: completed
  - id: content-grid
    content: Create ContentGrid component and CSS module with responsive breakpoints
    status: completed
  - id: content-card-css
    content: Create ContentCard.module.css with shared card styling
    status: completed
    dependencies:
      - text-utils
  - id: article-card
    content: Create ArticleCard component using ContentCard styles
    status: completed
    dependencies:
      - content-card-css
      - date-formatters
  - id: podcast-card
    content: Create PodcastCard component using ContentCard styles
    status: completed
    dependencies:
      - content-card-css
      - date-formatters
  - id: author-card
    content: Create AuthorCard component and CSS module
    status: completed
    dependencies:
      - date-formatters
  - id: category-card
    content: Create CategoryCard component and CSS module
    status: completed
    dependencies:
      - date-formatters
  - id: author-list
    content: Create AuthorList component and CSS module with inline/block layouts
    status: completed
  - id: category-list
    content: Create CategoryList component and CSS module using Tag component
    status: completed
---

# Content Display Components Implementation

This plan implements three phases of content display components: foundational utilities, card components, and relationship display components.

## Architecture Overview

The implementation follows existing patterns:

- CSS modules with responsive breakpoints (640px, 960px)
- TypeScript types from `frontend/src/lib/rss/media.ts` and `frontend/src/lib/rss/articlefeed.ts`
- Next.js Image component with `mediaUrlToAbsolute()` and `getOptimalMediaFormat()`
- Route helpers from `frontend/src/lib/routes.ts`
- CSS custom properties from `frontend/src/styles/theme.css`

## Task 1: Foundation Utilities and Layout

### 1.1 Text Utilities (`frontend/src/lib/textUtils.ts`)

Create utilities for CSS line-clamp support:

- `getLineClampCSS(lines: number)`: Returns CSS object with `-webkit-line-clamp`, `line-clamp`, `display: -webkit-box`, `-webkit-box-orient: vertical`, `overflow: hidden`
- `getLineClampCustomProperty(lines: number)`: Returns CSS custom property string `--line-clamp: {lines}` for use in CSS modules
- Export both functions for use in components and CSS

**Implementation notes:**

- CSS-only approach (no JavaScript fallback per user preference)
- Support 1-10 lines (common use cases)
- Use `-webkit-line-clamp` for browser compatibility

### 1.2 Date Formatters (`frontend/src/lib/dateFormatters.ts`)

Create German locale date formatting utilities:

- `formatDateFull(date: string | null | undefined)`: Full date format using `toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })`
- `formatDateShort(date: string | null | undefined)`: Short format using `toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' })`
- `formatDateRelative(date: string | null | undefined)`: Relative format using `Intl.RelativeTimeFormat('de-DE')` (e.g., "vor 2 Tagen", "heute", "morgen")
- All functions accept date from `getEffectiveDate()` and return `'—'` for null/undefined/invalid dates
- Use `getEffectiveDate()` from `frontend/src/lib/effectiveDate.ts` as the date source

**Implementation notes:**

- Native `Intl.RelativeTimeFormat` API (no dependencies)
- Handle edge cases: today, yesterday, tomorrow, and days/weeks/months/years ago
- Fallback to short date format if relative calculation fails

### 1.3 ContentGrid Component (`frontend/src/components/ContentGrid.tsx` + `ContentGrid.module.css`)

Create responsive grid wrapper component:

- Props interface:
- `children: ReactNode`
- `gap?: 'compact' | 'comfortable' | 'spacious'` (default: 'comfortable')
- `className?: string`
- Responsive breakpoints:
- `@media (min-width: 960px)`: 3 columns
- `@media (min-width: 640px) and (max-width: 959px)`: 2 columns
- `@media (max-width: 639px)`: 1 column
- Gap variants:
- `compact`: 12px gap
- `comfortable`: 20px gap (default)
- `spacious`: 32px gap
- Use CSS Grid with `grid-template-columns: repeat(auto-fit, minmax(min-content, 1fr))`
- Apply responsive breakpoints via media queries

## Task 2: Card Components

### 2.1 Shared ContentCard Styles (`frontend/src/components/ContentCard.module.css`)

Create shared CSS module for ArticleCard and PodcastCard:

- Card container: `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: var(--border-radius)`, `box-shadow: var(--shadow-soft)`
- Cover image section: Aspect ratio container, responsive sizing
- Card body: Padding, spacing, typography
- Title link: Hover states matching existing link patterns
- Description: Text truncation using line-clamp utilities
- Meta row: Flex layout for tags and dates
- Responsive breakpoints matching existing patterns (640px, 960px)
- Loading state styles matching `loadingPlaceholder.module.css` patterns

### 2.2 ArticleCard Component (`frontend/src/components/ArticleCard.tsx`)

Create article card component:

- Props interface:
- `article: StrapiArticle` (from `frontend/src/lib/rss/articlefeed.ts`)
- `showAuthors?: boolean`
- `showCategories?: boolean`
- `descriptionLines?: number` (default: 3)
- `className?: string`
- Display:
- Cover image using Next.js `Image` with `mediaUrlToAbsolute(pickCoverMedia(article.base, article.categories))`
- Title as link to `/artikel/${article.slug}` using Next.js `Link`
- Formatted date using `formatDateShort(getEffectiveDate(article))`
- Truncated description using line-clamp CSS
- Optional authors list (if `showAuthors` and `article.authors` exists)
- Optional categories list (if `showCategories` and `article.categories` exists)
- Semantic HTML: `<article>` wrapper, linked image and content sections
- Loading state: Use `loadingPlaceholder.module.css` patterns with skeleton

### 2.3 PodcastCard Component (`frontend/src/components/PodcastCard.tsx`)

Create podcast card component:

- Props interface: Same as ArticleCard but with `podcast: StrapiPodcast`
- Display: Similar to ArticleCard but:
- Link to `/podcasts/${podcast.slug}`
- Optional duration display if available
- Use `pickCoverMedia(podcast.base, podcast.categories)` for cover
- Reuse ContentCard.module.css styles

### 2.4 AuthorCard Component (`frontend/src/components/AuthorCard.tsx` + `AuthorCard.module.css`)

Create author card component:

- Props interface:
- `author: StrapiAuthor` (from `frontend/src/lib/rss/media.ts`)
- `articleCount?: number`
- `podcastCount?: number`
- `className?: string`
- Display:
- Avatar: 64x64px circular image using `getOptimalMediaFormat(author.avatar, 'small')` and `normalizeStrapiMedia()`
- Title as link to `/team/${author.slug}`
- Description (truncated if long)
- Content counts: "X Artikel, Y Podcasts" format
- CSS module with hover states and responsive sizing
- Use existing breakpoint patterns

### 2.5 CategoryCard Component (`frontend/src/components/CategoryCard.tsx` + `CategoryCard.module.css`)

Create category card component:

- Props interface:
- `category: StrapiCategoryRef` (from `frontend/src/lib/rss/media.ts`)
- `articleCount?: number`
- `podcastCount?: number`
- `className?: string`
- Display:
- Title as link to `/kategorien/${category.slug}`
- Description (truncated if long)
- Content counts: "X Artikel, Y Podcasts" format
- Similar styling to AuthorCard but without avatar
- Hover states and responsive breakpoints

## Task 3: Relationship Display Components

### 3.1 AuthorList Component (`frontend/src/components/AuthorList.tsx` + `AuthorList.module.css`)

Create author list component:

- Props interface:
- `authors: StrapiAuthor[]`
- `showAvatars?: boolean` (default: true)
- `layout?: 'inline' | 'block'` (default: 'inline')
- `maxDisplay?: number` (optional limit)
- Display:
- Inline layout: Comma-separated list with optional avatars (small circular, 32x32px)
- Block layout: Vertical list with larger avatars (48x48px)
- Each author links to `/team/${author.slug}` using Next.js `Link`
- Text-only mode when `showAvatars` is false
- Truncate with "und X weitere" if `maxDisplay` is set
- CSS module:
- Inline: `display: inline-flex`, `align-items: center`, comma-separated styling
- Block: Vertical stack with gap
- Responsive breakpoints
- Reference `Tag.tsx` pattern for styling approach

### 3.2 CategoryList Component (`frontend/src/components/CategoryList.tsx` + `CategoryList.module.css`)

Create category list component:

- Props interface:
- `categories: StrapiCategoryRef[]`
- `showCounts?: boolean` (default: false)
- `maxDisplay?: number` (optional limit)
- Display:
- Render categories using existing `Tag` component from `frontend/src/components/Tag.tsx`
- Each category links to `/kategorien/${category.slug}` using Next.js `Link`
- Optional count display: "Kategorie (5)" format
- Truncate with "..." indicator if `maxDisplay` is set
- CSS module:
- Horizontal scrolling on mobile (`overflow-x: auto`, `-webkit-overflow-scrolling: touch`)
- Wrapped grid on desktop (`display: flex`, `flex-wrap: wrap`, `gap`)
- Responsive breakpoints matching existing patterns
- Use Tag component styling as base

## Implementation Order

1. **Phase 1**: Create utility files (`textUtils.ts`, `dateFormatters.ts`)
2. **Phase 2**: Create ContentGrid component and CSS
3. **Phase 3**: Create shared ContentCard CSS module
4. **Phase 4**: Create ArticleCard and PodcastCard components
5. **Phase 5**: Create AuthorCard and CategoryCard components with CSS
6. **Phase 6**: Create AuthorList and CategoryList components with CSS

## Dependencies

- Existing: `getEffectiveDate()`, `mediaUrlToAbsolute()`, `normalizeStrapiMedia()`, `getOptimalMediaFormat()`, `pickCoverMedia()`, `Tag` component, Next.js `Image` and `Link`
- No new npm packages required (using native Intl APIs)

## Testing Considerations

- Verify responsive breakpoints at 640px and 960px
- Test date formatting with various date inputs (null, undefined, invalid, valid)
- Test line-clamp truncation with long text
- Verify image loading with missing/undefined media