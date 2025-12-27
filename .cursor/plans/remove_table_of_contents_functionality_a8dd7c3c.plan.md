---
name: Remove Table of Contents functionality
overview: Completely remove all TOC-related code and replace ContentWithTocClient usage with direct Markdown component rendering wrapped in ContentLayout on article, podcast, and about pages.
todos:
  - id: replace-article-page
    content: Replace ContentWithTocClient with direct Markdown component in artikel/[slug]/page.tsx
    status: pending
  - id: replace-podcast-page
    content: Replace ContentWithTocClient with direct Markdown component in podcasts/[slug]/page.tsx
    status: pending
  - id: replace-about-page
    content: Replace ContentWithTocClient with direct Markdown component in ueber-uns/page.tsx
    status: pending
  - id: delete-toc-components
    content: Delete ContentWithToc.tsx, ContentWithTocClient.tsx, TableOfContents.tsx and their CSS modules
    status: pending
    dependencies:
      - replace-article-page
      - replace-podcast-page
      - replace-about-page
  - id: delete-toc-hook
    content: Delete useExtractHeadings.ts hook
    status: pending
    dependencies:
      - delete-toc-components
  - id: verify-no-references
    content: Search and verify no remaining references to TOC components exist
    status: pending
    dependencies:
      - delete-toc-hook
---

# Remove Table of Contents Functionality

## Overview

Remove all Table of Contents (TOC) functionality from the codebase. Replace `ContentWithTocClient` usage with direct `Markdown` component rendering wrapped in `ContentLayout` for consistent layout.

## Implementation Tasks

### Task 1: Replace ContentWithTocClient usage in pages

**Update `frontend/app/artikel/[slug]/page.tsx`:**

- Remove import: `import {ContentWithTocClient} from '@/src/components/ContentWithTocClient';`
- Add import: `import {Markdown} from '@/src/lib/markdown/Markdown';`
- Replace `<ContentWithTocClient markdown={article.content ?? ''} contentClassName={styles.content} />` with:
  ```tsx
    <ContentLayout>
        <div className={styles.content}>
            <Markdown markdown={article.content ?? ''} />
        </div>
    </ContentLayout>
  ```


**Update `frontend/app/podcasts/[slug]/page.tsx`:**

- Remove import: `import {ContentWithTocClient} from '@/src/components/ContentWithTocClient';`
- Add import: `import {Markdown} from '@/src/lib/markdown/Markdown';`
- Replace `<ContentWithTocClient markdown={episode.shownotes ?? ''} contentClassName={styles.content} />` with:
  ```tsx
    <ContentLayout>
        <div className={styles.content}>
            <Markdown markdown={episode.shownotes ?? ''} />
        </div>
    </ContentLayout>
  ```


**Update `frontend/app/ueber-uns/page.tsx`:**

- Remove import: `import {ContentWithTocClient} from '@/src/components/ContentWithTocClient';`
- Add import: `import {Markdown} from '@/src/lib/markdown/Markdown';`
- Replace `<ContentWithTocClient markdown={about.content} />` with:
  ```tsx
    <ContentLayout>
        <Markdown markdown={about.content} />
    </ContentLayout>
  ```




### Task 2: Delete TOC-related component files

Delete the following files:

- `frontend/src/components/ContentWithToc.tsx`
- `frontend/src/components/ContentWithTocClient.tsx`
- `frontend/src/components/TableOfContents.tsx`
- `frontend/src/components/TableOfContents.module.css`
- `frontend/src/components/ContentWithToc.module.css`

### Task 3: Delete TOC-related hook

Delete the following file:

- `frontend/src/hooks/useExtractHeadings.ts`

### Task 4: Verify no remaining references

Search for any remaining references to:

- `ContentWithToc`
- `ContentWithTocClient`
- `TableOfContents`
- `useExtractHeadings`