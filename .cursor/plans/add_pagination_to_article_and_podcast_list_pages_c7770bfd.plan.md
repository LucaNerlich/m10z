---
name: Add pagination to article and podcast list pages
overview: Implement page-based pagination (12 items per page) for both ArticleListPage and PodcastListPage components, reading page numbers from URL search parameters and rendering pagination controls when multiple pages exist.
todos:
  - id: article-pagination
    content: "Implement pagination in ArticleListPage: add useSearchParams, parse page param, update hook call to use currentPage and pageSize 12, extract pagination metadata, generate hrefs, render Pagination component conditionally"
    status: completed
  - id: podcast-pagination
    content: "Implement pagination in PodcastListPage: mirror ArticleListPage implementation with /podcasts route URLs"
    status: completed
---

# Add Pagination to Article and Podcast List Pages

## Overview

Implement page-based pagination for both the articles listing page (`/artikel`) and podcasts listing page (`/podcasts`), displaying 12 items per page. Both implementations will mirror the pattern used in `HomePage.tsx`.

## Implementation Details

### Task 1: ArticleListPage Pagination

**File:** `frontend/src/components/ArticleListPage.tsx`

1. **Add imports:**

- `useSearchParams` from `next/navigation`
- `Pagination` component from `@/src/components/Pagination`

2. **Parse page parameter:**

- Read `page` from URL search parameters using `useSearchParams()`
- Default to page 1 if missing or invalid
- Validate as positive integer (similar to `HomePage.tsx` `parsePageParam` function)

3. **Update hook call:**

- Change `useArticlesList(1, 100)` to `useArticlesList(currentPage, 12)`
- Use the parsed page number and fixed pageSize of 12

4. **Extract pagination metadata:**

- Access `data.pagination.page`, `data.pagination.pageCount`, `data.pagination.total` from the hook response
- The hook already returns `PaginatedResult` with pagination metadata

5. **Generate navigation URLs:**

- `previousHref`: `/artikel?page=${currentPage - 1}` when `currentPage > 1`, otherwise `undefined`
- `nextHref`: `/artikel?page=${currentPage + 1}` when `currentPage < pageCount`, otherwise `undefined`

6. **Render Pagination component:**

- Place after `ContentGrid` component
- Pass `currentPage`, `totalPages` (from `pageCount`), `previousHref`, and `nextHref`
- Only render when `data.items.length > 0` and `pageCount > 1`

7. **Remove client-side sorting:**

- The hook already returns items sorted by date descending from Strapi, so the `sortByDateDesc` call can be removed (items are already sorted server-side)

### Task 2: PodcastListPage Pagination

**File:** `frontend/src/components/PodcastListPage.tsx`Mirror the exact same implementation pattern as ArticleListPage:

1. **Add imports:**

- `useSearchParams` from `next/navigation`
- `Pagination` component from `@/src/components/Pagination`

2. **Parse page parameter:**

- Same validation logic as ArticleListPage

3. **Update hook call:**

- Change `usePodcastsList(1, 100)` to `usePodcastsList(currentPage, 12)`

4. **Extract pagination metadata:**

- Same extraction pattern as ArticleListPage

5. **Generate navigation URLs:**

- Use `/podcasts?page=${page}` instead of `/artikel?page=${page}`

6. **Render Pagination component:**

- Same conditional rendering logic

7. **Remove client-side sorting:**

- Same as ArticleListPage (items already sorted server-side)

## Technical Notes

- Both hooks (`useArticlesList` and `usePodcastsList`) already support pagination and return `PaginatedResult<T>` with pagination metadata
- The `Pagination` component accepts `currentPage`, `totalPages`, `previousHref`, and `nextHref` props
- Page validation should ensure the page number is a positive integer (minimum 1)
- Pagination should only be displayed when there are items and more than one page exists
- The implementation follows the same pattern as `HomePage.tsx` for consistency

## Files to Modify

- `frontend/src/components/ArticleListPage.tsx` - Add pagination support