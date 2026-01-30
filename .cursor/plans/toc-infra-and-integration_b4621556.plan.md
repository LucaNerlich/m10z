---
name: toc-infra-and-integration
overview: Add a markdown heading extractor and server-rendered TOC sidebar, then integrate it into article and podcast detail pages with conditional two-column layout and responsive styling.
todos:
  - id: create-heading-utils
    content: Implement headline extraction + rehype-style slugger
    status: completed
  - id: build-toc-component
    content: Add ContentTOC component and CSS module
    status: completed
  - id: wire-article-toc
    content: Integrate TOC and grid layout into ArticleDetail
    status: completed
  - id: wire-podcast-toc
    content: Integrate TOC and grid layout into PodcastDetail
    status: completed
---

## Approach

- Build a small heading extraction utility in [`frontend/src/lib/extractHeadlines.ts`](frontend/src/lib/extractHeadlines.ts) that scans markdown lines for `##`, `###`, `####`, normalizes text, and generates rehype-slug-style IDs (lowercase, trim, spaces to hyphens, remove punctuation, and de-dupe with numeric suffixes).
- Add a server component `ContentTOC` in [`frontend/src/components/ContentTOC.tsx`](frontend/src/components/ContentTOC.tsx) plus [`frontend/src/components/ContentTOC.module.css`](frontend/src/components/ContentTOC.module.css) to render an accessible `<aside>` with anchor links and visual indentation by level.
- Create new component-level CSS modules for article and podcast detail per your choice, then update `ArticleDetail` and `PodcastDetail` to use a conditional grid wrapper only when the TOC is present.

## Key files

- New: [`frontend/src/lib/extractHeadlines.ts`](frontend/src/lib/extractHeadlines.ts)
- New: [`frontend/src/components/ContentTOC.tsx`](frontend/src/components/ContentTOC.tsx)
- New: [`frontend/src/components/ContentTOC.module.css`](frontend/src/components/ContentTOC.module.css)
- New: [`frontend/src/components/ArticleDetail.module.css`](frontend/src/components/ArticleDetail.module.css) (update `ArticleDetail` import)
- New: [`frontend/src/components/PodcastDetail.module.css`](frontend/src/components/PodcastDetail.module.css) (update `PodcastDetail` import)
- Update: [`frontend/src/components/ArticleDetail.tsx`](frontend/src/components/ArticleDetail.tsx)
- Update: [`frontend/src/components/PodcastDetail.tsx`](frontend/src/components/PodcastDetail.tsx)

## Notes on implementation

- Heading extraction will ignore `#` (level 1) to match the spec; `##`-`####` only.
- Slug de-duplication will follow `rehype-slug`/`github-slugger` style: first occurrence uses base slug, subsequent duplicates get `-1`, `-2`, etc.
- Empty content or no headings returns `[]` and results in no TOC.
- Layout will use a wrapper element with a conditional class (e.g., `withToc`) to apply `grid-template-columns: minmax(240px, 320px) 1fr` only when TOC is rendered; otherwise, it stays single-column.

## Todos

- create-heading-utils: Implement `extractHeadlines` with slugging and de-dupe
- build-toc-component: Add `ContentTOC` server component and CSS module
- wire-article-toc: Update `ArticleDetail` + new CSS module with grid wrapper
- wire-podcast-toc: Update `PodcastDetail` + new CSS module with grid wrapper