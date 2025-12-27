---
name: Refactor TOC heading extraction and conditional layout
overview: Move heading extraction from TableOfContents to a reusable hook in ContentWithToc, enabling layout decisions before rendering. Update components to conditionally render TOC only when headings exist, and add CSS module for conditional layout styling.
todos:
  - id: create-hook
    content: Create useExtractHeadings hook with contentRef parameter, extract headings logic, return headings array and loading state
    status: pending
  - id: update-content-with-toc-hook
    content: Update ContentWithToc to use useExtractHeadings hook and add hasHeadings state
    status: pending
    dependencies:
      - create-hook
  - id: update-toc-props
    content: Update TableOfContents to accept headings and contentRef as props, remove internal extraction logic
    status: pending
    dependencies:
      - create-hook
  - id: conditional-render
    content: "Add conditional rendering in ContentWithToc: only render TOC when showToc && hasHeadings"
    status: pending
    dependencies:
      - update-content-with-toc-hook
      - update-toc-props
  - id: create-css-module
    content: Create ContentWithToc.module.css with base styles and conditional withToc class for two-column layout
    status: pending
  - id: apply-css-classes
    content: Apply conditional CSS classes to ContentWithToc wrapper based on hasHeadings state
    status: pending
    dependencies:
      - create-css-module
      - conditional-render
  - id: verify-client-wrapper
    content: Verify ContentWithTocClient correctly forwards props and types align
    status: pending
    dependencies:
      - update-content-with-toc-hook
---

# Refactor TOC Heading Extraction and Conditional Layout

## Overview

Refactor the Table of Contents implementation to extract headings in the parent component (`ContentWithToc`) rather than in `TableOfContents`, enabling layout decisions before rendering. Add conditional rendering and styling based on whether headings exist.

## Implementation Tasks

### Task 1: Extract heading logic to hook

**Create `frontend/src/hooks/useExtractHeadings.ts`:**

- Accept `contentRef: React.RefObject<HTMLElement | null>` parameter
- Extract headings using `querySelectorAll` for `h2, h3, h4` elements with IDs (matching current logic from [TableOfContents.tsx](frontend/src/components/TableOfContents.tsx:32-47))
- Filter headings to only include those with IDs
- Process text content (remove trailing anchor icon: `/#\s*$/`)
- Return `{ headings: Heading[], isLoading: boolean }` where `isLoading` is true until headings are extracted
- Use `useEffect` to re-extract when `contentRef.current` changes

**Update `frontend/src/components/ContentWithToc.tsx`:**

- Import `useExtractHeadings` hook
- Call hook with `contentRef`
- Add `hasHeadings` boolean state: `const hasHeadings = headings.length > 0`
- Pass `headings` array to `TableOfContents` component (prepare for Task 2)

**Update `frontend/src/components/TableOfContents.tsx`:**

- Change props interface: remove `contentRef`, add `headings: Heading[]` as required prop
- Remove internal `headings` state and heading extraction `useEffect` (lines 24, 29-50)
- Keep `contentRef` parameter in `handleClick` and IntersectionObserver `useEffect` (lines 54-98) - update to accept `contentRef` as prop or derive from headings
- Update early return condition: `if (headings.length === 0) return null`
- Update IntersectionObserver to use `contentRef` prop (need to add back as prop for scroll tracking)

### Task 2: Conditional layout and styling

**Update `frontend/src/components/ContentWithToc.tsx`:**

- Add wrapper `div` with conditional CSS class: apply `withToc` class only when `showToc && hasHeadings` are both true
- Conditionally render `TableOfContents` only when `showToc && hasHeadings`
- Pass `headings` prop to `TableOfContents`
- Pass `contentRef` to `TableOfContents` (needed for IntersectionObserver and click handling)
- Import CSS module: `import styles from './ContentWithToc.module.css'`

**Create `frontend/src/components/ContentWithToc.module.css`:**

- Base styles: single-column layout (full-width content wrapper)
- `.withToc` class: two-column grid/flex layout for content + TOC
- Responsive breakpoint at `641px` (matching ContentLayout breakpoint)
- Smooth layout transitions

**Update `frontend/src/components/TableOfContents.tsx`:**

- Add `contentRef` back to props (needed for IntersectionObserver and scroll handling)
- Props interface: `{ headings: Heading[], contentRef: React.RefObject<HTMLElement | null> }`

### Task 3: Verify ContentWithTocClient

**Review `frontend/src/components/ContentWithTocClient.tsx`:**

- Verify that spread props (`{...props}`) correctly forward all props to `ContentWithToc`
- Confirm TypeScript types align with updated `ContentWithTocProps` interface
- No code changes expected - validation only

## Technical Notes

- The `Heading` type is already defined in `TableOfContents.tsx` (lines 6-10) - consider exporting it for reuse
- IntersectionObserver logic in `TableOfContents` (lines 53-98) needs `contentRef` to query DOM elements, so it should remain a prop
- The `handleClick` function (lines 101-114) also needs `contentRef` for scroll behavior