---
name: Remove nested ContentLayout and add text justification
overview: Remove redundant ContentLayout wrappers from article and podcast detail pages (root layout already provides ContentLayout), and add text justification to markdown content for improved readability.
todos:
  - id: remove-contentlayout-article
    content: Remove ContentLayout import and wrapper from frontend/app/artikel/[slug]/page.tsx
    status: pending
  - id: remove-contentlayout-podcast
    content: Remove ContentLayout import and wrapper from frontend/app/podcasts/[slug]/page.tsx
    status: pending
  - id: add-text-justification
    content: "Add text-align: justify to .markdown-content p and create .markdown-content li selector in markdown.css"
    status: pending
---

# Remove Nested ContentLayout Wrappers and Add Text Justification

## Task 1: Remove Nested ContentLayout Wrappers

The root layout at [`frontend/app/layout.tsx`](frontend/app/layout.tsx) already wraps all page content in `ContentLayout` (line 75). The detail pages are creating nested wrappers, causing width misalignment.

### Changes to `frontend/app/artikel/[slug]/page.tsx`:

- Remove `ContentLayout` import from line 15
- Remove the `<ContentLayout>` opening tag on line 116
- Remove the `</ContentLayout>` closing tag on line 145
- Keep the `<article>` element and all child components unchanged

### Changes to `frontend/app/podcasts/[slug]/page.tsx`:

- Remove `ContentLayout` import from line 19
- Remove the `<ContentLayout>` opening tag on line 125
- Remove the `</ContentLayout>` closing tag on line 156
- Keep the `<article>` element and all child components unchanged

## Task 2: Add Text Justification to Markdown Content

Add `text-align: justify;` to markdown paragraph styles for improved readability with hyphenation.

### Changes to `frontend/src/styles/components/markdown.css`:

- Add `text-align: justify;` to the `.markdown-content p` selector (starting at line 117)