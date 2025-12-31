---
name: Description Fallback Logic
overview: Add fallback logic to ArticleCard and PodcastCard components to display the first category's description when the content's own description is empty.
todos:
  - id: article-card-fallback
    content: Add effectiveDescription extraction and update conditional/render logic in ArticleCard.tsx
    status: completed
  - id: podcast-card-fallback
    content: Add effectiveDescription extraction and update conditional/render logic in PodcastCard.tsx
    status: completed
---

# Description Fallback Logic Implementation

## Overview

Update `ArticleCard` and `PodcastCard` components to use the first category's description as a fallback when the content's own description is empty.

## Changes

### 1. ArticleCard Component (`frontend/src/components/ArticleCard.tsx`)

**Location**: After line 51 (after `readingTime` calculation, before `cardClasses`)Add effective description extraction:

```typescript
const effectiveDescription = article.base.description || article.categories?.[0]?.base?.description;
```

**Location**: Line 84-88Update the conditional check and rendered description:

- Change line 84: `{article.base.description ? (` → `{effectiveDescription ? (`
- Change line 86: `{article.base.description}` → `{effectiveDescription}`

### 2. PodcastCard Component (`frontend/src/components/PodcastCard.tsx`)

**Location**: After line 41 (after `podcastUrl` calculation, before `cardClasses`)Add effective description extraction:

```typescript
const effectiveDescription = podcast.base.description || podcast.categories?.[0]?.base?.description;
```

**Location**: Line 74-78Update the conditional check and rendered description:

- Change line 74: `{podcast.base.description ? (` → `{effectiveDescription ? (`
- Change line 76: `{podcast.base.description}` → `{effectiveDescription}`

## Implementation Details

- Both components already have access to `categories` arrays (typed as `StrapiCategoryRef[]`)
- The `StrapiCategoryRef` type includes optional `base.description` property
- Optional chaining (`?.`) ensures safe access to nested properties
- The fallback uses logical OR (`||`) to prefer the content's own description, falling back to the first category's description if empty

## Testing Considerations

- Verify cards display category descriptions when content descriptions are empty
- Verify cards still display content descriptions when they exist