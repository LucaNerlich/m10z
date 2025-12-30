---
name: ContentLayout width variants with CSS-only approach
overview: Add width variants ('default' 900px, 'wide' 1200px) to ContentLayout using CSS :has() selector to detect homepage marker, avoiding client components.
todos: []
---

# ContentLayout Width Variants with CSS-Only Approach

## Overview

Update `ContentLayout` to support width variants using pure CSS selectors. The homepage page component will include a data attribute marker, and CSS will use the `:has()` selector to detect it and apply the wide variant.

## Implementation Details

### Task 1: Update ContentLayout CSS

**File: `frontend/app/ContentLayout.module.css`**

- Change `.layout` max-width from `1200px` to `900px`
- Add new CSS rule using `:has()` selector: `main:has([data-homepage]) .layout `with `max-width: 1200px` to apply wide variant on homepage
- Keep all other existing styles (container, withSidebar, content, sidebar, media queries) unchanged

**File: `frontend/app/ContentLayout.tsx`**

- No changes needed - component remains as-is without width prop
- CSS will handle the width variant based on the homepage marker

### Task 2: Add Homepage Marker

**File: `frontend/app/page.tsx`**

- Add `data-homepage` attribute to the root `<div>` element (the one returned by `HomePage` component on line 146)
- This marker will be used by CSS to detect the homepage

**File: `frontend/app/layout.tsx`**

- No changes needed - layout remains unchanged

## Technical Notes

- Uses CSS `:has()` selector to detect the presence of `[data-homepage]` attribute within `<main>`
- When homepage marker is present, CSS applies wide variant (1200px) to ContentLayout
- All styling logic is handled by CSS - no JavaScript or client components needed
- The `data-homepage` attribute serves as a semantic marker that CSS can detect