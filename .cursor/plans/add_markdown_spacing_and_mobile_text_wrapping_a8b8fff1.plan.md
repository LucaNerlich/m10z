---
name: Add markdown spacing and mobile text wrapping
overview: Add consistent spacing to markdown content elements (paragraphs and images), add spacing between description and content sections on article/podcast pages, and implement balanced text wrapping for mobile devices.
todos:
  - id: add-markdown-paragraph-spacing
    content: Add .markdown-content p selector with 1.5rem bottom margin and :last-child override in global.css
    status: pending
  - id: add-markdown-image-spacing
    content: Add .markdown-content img selector with 1.5rem vertical margins in global.css
    status: pending
  - id: add-article-content-spacing
    content: Add 2.5rem top margin to .content class in artikel/[slug]/page.module.css
    status: pending
  - id: add-podcast-content-spacing
    content: Add 2.5rem top margin to .content class in podcasts/[slug]/page.module.css
    status: pending
  - id: add-mobile-text-wrap
    content: "Add mobile media query with text-wrap: balance for .markdown-content p in global.css"
    status: pending
    dependencies:
      - add-markdown-paragraph-spacing
---

# Add Markdown Spacing and Mobile Text Wrapping

This plan implements three styling improvements to enhance readability and visual consistency across markdown content and article/podcast pages.

## Changes

### Task 1: Markdown Content Spacing ([frontend/src/styles/global.css](frontend/src/styles/global.css))

Add spacing rules for paragraphs and images within `.markdown-content`:

- Add `.markdown-content p` selector with `margin-bottom: 1.5rem`
- Add `.markdown-content p:last-child` selector with `margin-bottom: 0` to remove spacing from last paragraphs
- Add `.markdown-content img` selector with `margin: 1.5rem 0` for vertical spacing

These styles will be placed after the existing `.markdown-content` styles (after the `mark` styles around line 196).

### Task 2: Content Section Spacing

Add top margin to `.content` class in both page modules:

- [frontend/app/artikel/[slug]/page.module.css](frontend/app/artikel/[slug]/page.module.css): Add `margin-top: 2.5rem` to `.content` class (line 27)
- [frontend/app/podcasts/[slug]/page.module.css](frontend/app/podcasts/[slug]/page.module.css): Add `margin-top: 2.5rem` to `.content` class (line 27) for consistency

This creates visual separation between the description and content sections.

### Task 3: Mobile Text Wrapping ([frontend/src/styles/global.css](frontend/src/styles/global.css))

Add mobile-specific text wrapping for better text distribution on small screens:

- Add media query `@media (max-width: 768px)` targeting `.markdown-content p`
- Apply `text-wrap: balance` property within the mobile breakpoint

This will be placed after the existing paragraph styles, reusing the same breakpoint pattern already used for table responsive styles (line 136).

## Implementation Notes

- All spacing values use `rem` units for consistency with existing styles
- The `text-wrap: balance` property improves text distribution on mobile devices by balancing line lengths
- Last paragraph spacing removal ensures no extra whitespace at the end of content containers