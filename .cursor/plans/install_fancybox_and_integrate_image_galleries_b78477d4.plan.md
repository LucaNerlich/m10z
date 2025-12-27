---
name: Install Fancybox and integrate image galleries
overview: Install @fancyapps/ui package, create/update ContentWithToc component with Fancybox initialization for article image galleries, and update Markdown component to wrap images with Fancybox-enabled anchor tags for accessible lightbox functionality.
todos:
  - id: install-fancybox
    content: Add @fancyapps/ui package to frontend/package.json dependencies
    status: completed
  - id: create-content-with-toc
    content: Create ContentWithToc.tsx component with contentRef, useEffect hook, and Fancybox initialization/cleanup
    status: completed
    dependencies:
      - install-fancybox
  - id: update-markdown-images
    content: Update Markdown.tsx img component to wrap SafeImage with anchor tag containing data-fancybox attribute and aria-label
    status: completed
    dependencies:
      - install-fancybox
  - id: integrate-article-pages
    content: Wrap MarkdownClient with ContentWithToc in artikel/[slug]/page.tsx
    status: completed
    dependencies:
      - create-content-with-toc
      - update-markdown-images
  - id: verify-accessibility
    content: Test keyboard navigation, focus management, screen reader support, and alt text preservation
    status: completed
    dependencies:
      - create-content-with-toc
      - update-markdown-images
      - integrate-article-pages
---

# Install Fancybox and Integrate Image Galleries

## Overview

Add Fancybox lightbox functionality to article image galleries. Install the Fancybox library, initialize it in a ContentWithToc component wrapper, and update markdown image rendering to enable gallery navigation.

## Implementation Tasks

### Task 1: Install Fancybox Package

**Update `frontend/package.json`:**

- Add `@fancyapps/ui` to dependencies
- Version: Use latest stable version (e.g., `^5.0.0`)

### Task 2: Create/Update ContentWithToc Component

**Create `frontend/src/components/ContentWithToc.tsx`** (if it doesn't exist) or update existing:

- Create client component with `'use client'` directive
- Accept `children: React.ReactNode` prop
- Create `contentRef` using `useRef<HTMLDivElement>(null)`
- Add `useEffect` hook that:
- Imports Fancybox dynamically (or statically if SSR-safe)
- Calls `Fancybox.bind(contentRef.current, '[data-fancybox="article-gallery"]', {...options})`
- Configure options:
    - `keyboard: true` for keyboard navigation
    - `loop: true` for gallery looping
    - `toolbar: true` for toolbar controls
    - `thumbs: { autoStart: false }` for thumbnail navigation (optional)
- Returns cleanup function that calls `Fancybox.unbind()` and `Fancybox.close()`
- Import Fancybox CSS: `import '@fancyapps/ui/dist/fancybox/fancybox.css'`
- Render wrapper `div` with `ref={contentRef}` containing `{children}`

**Note:** If ContentWithToc already exists with different structure, adapt the Fancybox initialization to work with the existing useEffect hook and contentRef setup.

### Task 3: Update Markdown Image Rendering

**Update `frontend/src/lib/markdown/Markdown.tsx`:**

- Modify the `img` component mapping (lines 95-110)
- Wrap `SafeImage` component with an anchor tag:
  ```tsx
      <a 
        href={url} 
        data-fancybox="article-gallery"
        aria-label={`View image: ${alt || 'Gallery image'}`}
        style={{ display: 'inline-block', width: '100%' }}
      >
        <SafeImage ... />
      </a>
  ```




- Preserve existing URL resolution logic (`toAbsoluteUrl` for relative paths)
- Maintain all existing SafeImage props (src, alt, width, height, sizes, style)
- Ensure anchor inherits proper styling for layout (inline-block, full width)

### Task 4: Integrate ContentWithToc in Article Pages

**Update `frontend/app/artikel/[slug]/page.tsx`:**

- Import `ContentWithToc` component
- Wrap the `MarkdownClient` component (line 131) with `ContentWithToc`:
  ```tsx
      <ContentWithToc>
        <MarkdownClient markdown={article.content ?? ''} />
      </ContentWithToc>
  ```


**Update `frontend/app/podcasts/[slug]/page.tsx`** (if applicable):

- Apply same pattern if podcast pages also use markdown content with images

### Task 5: Accessibility Verification

**Verify accessibility features:**

- Alt text: Ensure `alt` prop from markdown is preserved and passed to both anchor `aria-label` and `SafeImage`
- Keyboard navigation: Test Escape key closes lightbox, arrow keys navigate gallery
- Focus management: Verify focus returns to trigger element after closing
- Screen reader: Confirm `aria-label` provides context ("View image: [alt text]")
- Focus trap: Verify Fancybox traps focus within lightbox when open

## Technical Notes

- Fancybox initialization should happen after content is mounted (useEffect dependency on contentRef.current)
- Use dynamic import for Fancybox if SSR compatibility is needed: `const Fancybox = (await import('@fancyapps/ui')).Fancybox`
- Gallery grouping: All images with `data-fancybox="article-gallery"` will be grouped together
- URL handling: Ensure absolute URLs are used for Fancybox href (already handled by `toAbsoluteUrl`)
- Cleanup: Properly unbind Fancybox on unmount to prevent memory leaks
- CSS: Fancybox CSS should be imported at component level or in a global CSS file

## Dependencies

- `@fancyapps/ui`: Fancybox library for lightbox functionality
- Existing: `SafeImage` component, `toAbsoluteUrl` utility, React hooks

## Files to Modify

1. `frontend/package.json` - Add dependency
2. `frontend/src/components/ContentWithToc.tsx` - Create/update with Fancybox initialization
3. `frontend/src/lib/markdown/Markdown.tsx` - Wrap images with Fancybox anchors