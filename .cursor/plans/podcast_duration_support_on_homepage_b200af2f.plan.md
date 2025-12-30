---
name: Podcast duration support on homepage
overview: Extend the homepage to support podcast duration in the data structure and conditionally display reading time for articles and listening duration for podcasts in the feed cards.
todos:
  - id: extend-feeditem-type
    content: "Add duration?: number | null field to podcast variant of FeedItem union type"
    status: completed
  - id: update-podcast-mapping
    content: "Update mapPodcastsToFeed() to extract and include duration: podcast.duration ?? null"
    status: completed
    dependencies:
      - extend-feeditem-type
  - id: import-formatduration
    content: Import formatDuration from @/src/lib/dateFormatters
    status: completed
  - id: update-metadata-display
    content: Update metadata rendering section to conditionally show reading time for articles and formatted duration for podcasts, both using styles.readingTime class
    status: completed
    dependencies:
      - extend-feeditem-type
      - import-formatduration
---

# Podcast Duration Support on Homepage

## Overview

Extend the homepage feed to support podcast duration and conditionally display reading time for articles and listening duration for podcasts.

## Changes

### Task 1: Extend FeedItem Type and Mapping

**File: [frontend/app/page.tsx](frontend/app/page.tsx)**

1. **Update FeedItem discriminated union** (lines 54-64):

- Add `duration?: number | null;` field to the podcast variant

2. **Update mapPodcastsToFeed function** (line 123):

- Add `duration: podcast.duration ?? null` to the returned object
- The `StrapiPodcast` type already has a `duration: number` field, so we extract it with a null fallback

### Task 2: Conditional Metadata Display

**File: [frontend/app/page.tsx](frontend/app/page.tsx)**

1. **Add import** (line 15):

- Import `formatDuration` from `@/src/lib/dateFormatters` alongside existing `formatDateShort` import

2. **Update metadata rendering** (lines 278-282):

- Replace the current conditional that only checks `wordCount` with a type-aware conditional:
    - For articles (`item.type === 'article'`): Show "📖 [reading time]" when `wordCount` exists
    - For podcasts (`item.type === 'podcast'`): Show "🎶 [formatted duration]" when `duration` exists
- Both variants should use the `styles.readingTime` CSS class (already defined in `page.module.css`)

## Implementation Details

- The `formatDuration` function expects seconds and returns formatted strings like "1:23:45" or "23:45"
- The `calculateReadingTime` function is already imported and used
- The `.readingTime` CSS class already exists in `page.module.css` (lines 175-179)
- The conditional rendering should handle null/undefined values gracefully

## Data Flow

```javascript
StrapiPodcast (has duration: number)
  ↓
mapPodcastsToFeed()
  ↓
FeedItem (podcast variant with duration?: number | null)
  ↓
FeedContent rendering
  ↓
Conditional display: duration ? formatDuration(duration) : null


```