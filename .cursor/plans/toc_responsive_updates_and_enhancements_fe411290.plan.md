---
name: TOC Responsive Updates and Enhancements
overview: Update TOC responsive behavior, add type badges to TOC entries, and implement scroll offset for anchor links. Changes involve CSS breakpoint adjustments, component updates to include Tag badges, and scroll margin configuration.
todos:
  - id: update-responsive-breakpoint
    content: "Change media query breakpoint from 960px to 767px and ensure TOC uses position: static with no top offset"
    status: completed
  - id: add-toc-type-badges
    content: Add Tag component to TOC entries showing article/podcast type, update flex layout styling
    status: completed
  - id: implement-scroll-offset
    content: Add scroll-margin-top to article cards and smooth scroll behavior
    status: completed
---

# TOC Responsive Updates and Enhancements

## Overview

This plan implements three improvements to the Table of Contents (TOC) on the home page:

1. Update responsive breakpoint and remove sticky positioning on mobile/tablet
2. Add type badges (article/podcast) to TOC entries
3. Add scroll offset to prevent content from being hidden under the header

## Files to Modify

### [frontend/app/page.module.css](frontend/app/page.module.css)

**Task 1: Update responsive breakpoint**

- Change media query from `@media (max-width: 960px)` (line 27) to `@media (max-width: 767px)`
- Ensure `.toc` applies `position: static` at this breakpoint (already present, but verify)
- Remove `top: 96px` offset when TOC is static (add `top: auto` or remove it in the media query)
- Grid layout already switches to single column, no changes needed
- Verify no margin-top or gap issues between header and TOC on mobile

**Task 2: Add flex layout for TOC entries with tags**

- Update `.tocLink` (line 65) to accommodate Tag component alongside title
- Ensure proper spacing between tag and text
- Add responsive styling for mobile viewports

**Task 3: Add scroll offset**

- Add `scroll-margin-top: 85px` to `.card` class (line 88) - applies to article elements
- Add `scroll-behavior: smooth` to `html` or `.page` container for smooth scrolling
- Verify offset works on both desktop (with sticky TOC) and mobile (static TOC)

### [frontend/app/page.tsx](frontend/app/page.tsx)

**Task 2: Add Tag component to TOC entries**

- Tag component is already imported (line 5)
- Add `<Tag>` component inside each TOC list item (around lines 194-199)
- Pass `item.type` to Tag to display "article" or "podcast" badges
- Update the TOC link structure to accommodate tag alongside title and date

## Implementation Details

### Task 1: Responsive Breakpoint

- Change breakpoint from 960px to 767px to better target mobile/tablet devices
- When TOC becomes static, remove sticky positioning and top offset
- Grid already switches to single column at this breakpoint

### Task 2: Type Badges

- Add Tag component showing "Artikel" or "Podcast" based on `item.type`
- Position tag before the title in the TOC entry
- Ensure flex layout handles tag, title, and date appropriately
- Maintain responsive behavior on mobile

### Task 3: Scroll Offset

- Header height is ~58px (from Header.module.css: 10px padding + 38px logo + 10px padding)
- Set `scroll-margin-top: 85px` to account for header (58px) + padding (27px)
- Apply to `.card` elements which have the `id` anchors
- Add smooth scroll behavior for better UX

## Testing Considerations

- Verify TOC becomes static at 767px breakpoint
- Confirm type badges display correctly in TOC entries