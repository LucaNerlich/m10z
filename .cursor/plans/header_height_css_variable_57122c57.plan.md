---
name: Header Height CSS Variable
overview: Add a reusable CSS custom property for header height and apply it to scroll-margin-top and ContentLayout padding to maintain consistent spacing across the application.
todos:
  - id: add-header-height-variable
    content: Add --header-height CSS custom property (75px) to variables.css alongside --border-radius
    status: pending
  - id: update-scroll-margin
    content: Update global.css heading scroll-margin-top to use var(--header-height) instead of hardcoded 100px
    status: pending
  - id: add-contentlayout-padding
    content: "Add padding-top: var(--header-height) to ContentLayout.module.css .layout class"
    status: pending
  - id: update-homepage-margins
    content: Update page.module.css to use var(--header-height) + offset for .page margin-top and .toc sticky top positioning
    status: pending
---

# Header Height CSS Variable Implementation

This plan establishes a reusable CSS custom property for header height and applies it consistently across the application to prevent content from appearing behind the sticky header.

## Task 1: Add CSS Custom Property

### Files to modify:

- [`frontend/src/styles/variables.css`](frontend/src/styles/variables.css)
- [`frontend/src/styles/global.css`](frontend/src/styles/global.css)

### Changes:

1. **Add `--header-height` variable** in `variables.css`:

- Add `--header-height: 75px;` alongside the existing `--border-radius` token in the `:root` selector
- Value set to 75px (middle of the 70-80px range specified)

2. **Update scroll-margin-top** in `global.css`:

- Replace the hardcoded `scroll-margin-top: 100px;` on headings (lines 82-88) with `scroll-margin-top: var(--header-height);`

## Task 2: Add Padding to ContentLayout

### Files to modify:

- [`frontend/app/ContentLayout.module.css`](frontend/app/ContentLayout.module.css)

### Changes:

1. **Add padding-top to `.layout` class**:

- Add `padding-top: var(--header-height);` to the `.layout` class (currently at line 1-6)
- This ensures content doesn't appear behind the sticky header

## Task 3: Update Homepage Aside and Content Container Margins

### Files to modify:

- [`frontend/app/page.module.css`](frontend/app/page.module.css)

### Changes:

1. **Update `.page` margin-top**:

- Replace `margin-top: 1rem;` (line 25) with `margin-top: calc(var(--header-height) + 1rem);`
- This adds header height plus a small offset for visual spacing

2. **Update `.toc` sticky positioning**:

- Replace `top: calc(1rem + 64px);` (line 40) with `top: calc(var(--header-height) + 1rem);`
- This ensures the sticky aside positions correctly below the header with consistent spacing

## Verification

After implementation, verify:

- Heading anchor links scroll correctly with the new margin
- Content starts below the header on all page types (articles, podcasts, categories)
- Visual spacing is balanced on both desktop and mobile viewports
- No content appears hidden behind the sticky header
- Homepage aside (table of contents) sticks correctly below the header
- Homepage feed content has appropriate top spacing

## Notes

- The `--header-height` value (75px) can be adjusted if needed after visual testing
- The `Card.module.css` file also has a `scroll-margin-top: 85px` value, but this appears to be for card-specific anchor behavior and is not part of this task