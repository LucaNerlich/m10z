---
name: Equal-height cards and 16:9 fallback image
overview: Enforce equal-height alignment for ContentGrid cards by adding CSS grid properties, and replace the square fallback image with a 16:9 version to match card aspect ratios.
todos:
  - id: task1-css-update
    content: "Add align-items: stretch and grid-auto-rows: 1fr to ContentGrid.module.css .grid class"
    status: completed
  - id: task2-image-prep
    content: Create 16:9 version of m10z.jpg (1600x900 or 1920x1080, JPEG, ≤352KB)
    status: completed
  - id: task2-image-replace
    content: Replace frontend/public/images/m10z.jpg with 16:9 version
    status: completed
    dependencies:
      - task2-image-prep
---

# Equal-height cards and 16:9 fallback i

mage

## Overview

This plan addresses two visual improvements:

1. **Equal-height card alignment**: Ensure all cards in ContentGrid have equal height regardless of description length
2. **16:9 fallback image**: Replace square placeholder image with 16:9 aspect ratio version

## Task 1: Equal-height card alignment

### Current state

- [ContentGrid.module.css](frontend/src/components/ContentGrid.module.css) uses CSS Grid with responsive columns but lacks height alignment
- [ContentCard.module.css](frontend/src/components/ContentCard.module.css) already has correct flexbox structure:
- `.card` has `display: flex` and `flex-direction: column` ✓
- `.cardBody` has `flex: 1` ✓
- `.cardActions` has `margin-top: auto` ✓

### Changes required

**File: `frontend/src/components/ContentGrid.module.css`**

- Add `align-items: stretch` to `.grid` class (line 1-5)
- This ensures all grid items stretch to fill their row height
- Add `grid-auto-rows: 1fr` to `.grid` class (optional but recommended)
- This ensures rows have equal height distribution

### Implementation details

```css
.grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    align-items: stretch;        /* NEW */
    grid-auto-rows: 1fr;         /* NEW - optional */
}
```

The existing responsive breakpoints (640px, 960px) will continue to work as they only modify `grid-template-columns`.

## Task 2: Replace fallback image with 16:9 version

### Current state

- Current image: `frontend/public/images/m10z.jpg` (square format)
- Used in: `ArticleCard.tsx`, `PodcastCard.tsx`, `page.tsx`, `kategorien/[slug]/page.tsx`
- Card containers use `aspect-ratio: 16 / 9` (see [ContentCard.module.css](frontend/src/components/ContentCard.module.css) line 20)

### Changes required

**Image creation** (external step):

- Create 16:9 version of `m10z.jpg`:
- Dimensions: 1600x900px or 1920x1080px
- Crop/letterbox without distortion (maintain original content proportions)
- Format: JPEG
- File size: ≤352KB (optimized for web)
- Save as: `frontend/public/images/m10z.jpg` (replacing existing)

**File replacement**:

- Replace `frontend/public/images/m10z.jpg` with the new 16:9 version
- No code changes required (components already reference the correct path)

### Notes

- The image is imported as `placeholderCover` in components and used when no cover image is available
- Default dimensions in components are already 400x225 (16:9 ratio)
- The legacy `legacy/static/img/formate/cover/m10z.jpg` file is separate and not affected

## Verification

After implementation: