---
name: Add pagination to article and podcast list pages
overview: Implement page-based pagination for ArticleListPage and PodcastListPage components, showing 12 items per page with URL-based page navigation using the existing Pagination component.
todos: []
---

# Add Pagination to Article and Podcast List Pages

## Overview

Add page-based pagination to both the articles listing page (`/artikel`) and podcasts listing page (`/podcasts`), displaying 12 items per page. The implementation will read the current page from URL search parameters, validate it, pass it to the existing hooks, and render the `Pagination` component with proper navigation links.

## Implementation Details

### Task 1: ArticleListPage Pagination

**File:** `frontend/src/components/ArticleListPage.tsx`

1. **Add imports:**

- `useSearchParams` from `next/navigation` (for reading URL params)
- `Pagination` component from `@/src/components/Pagination`

2. **Parse page parameter:**

- Read `page` from URL search params using `useSearchParams()`
- Default to `1` if missing or invalid
- Validate as positive integer (similar to `HomePage.parsePageParam`)

3. **Update hook call:**

- Change `useArticlesList(1, 100)` to `useArticlesList(currentPage, 12)`
- The hook already normalizes and validates page/pageSize internally

4. **Extract pagination metadata:**

- Access `data.pagination.page`, `data.pagination.pageCount`, `data.pagination.total` from the returned `PaginatedResult`

5. **Calculate navigation URLs:**

- `previousHref`: `/artikel?page=${currentPage - 1}` when `currentPage > 1`, otherwise `undefined`
- `nextHref`: `/artikel?page=${currentPage + 1}` when `currentPage < pageCount`, otherwise `undefined`

6. **Render Pagination component:**

- Place after `ContentGrid` closing tag
- Pass `currentPage={data.pagination.page}`, `totalPages={data.pagination.pageCount}`, `previousHref`, and `nextHref`
- Only render when `data.items.length > 0` and `data.pagination.pageCount > 1`

### Task 2: PodcastListPage Pagination

**File:** `frontend/src/components/PodcastListPage.tsx`Mirror the ArticleListPage implementation:

1. **Add imports:** Same as ArticleListPage (`useSearchParams`, `Pagination`)
2. **Parse page parameter:** Same validation logic
3. **Update hook call:** Change `usePodcastsList(1, 100)` to `usePodcastsList(currentPage, 12)`
4. **Extract pagination metadata:** Same structure as ArticleListPage
5. **Calculate navigation URLs:** Use `/podcasts?page=${page}` instead of `/artikel?page=${page}`
6. **Render Pagination component:** Same conditional rendering logic

## Key Implementation Notes

- Both hooks (`useArticlesList` and `usePodcastsList`) already support pagination parameters and return `PaginatedResult<T>` with pagination metadata
- The `Pagination` component accepts `currentPage`, `totalPages`, `previousHref`, and `nextHref` props
- Page validation should ensure the value is a positive integer (default to 1 for invalid values)
- URLs follow the pattern: `/artikel?page=N` and `/podcasts?page=N`
- Pagination only renders when there are items and multiple pages exist
- The existing client-side sorting (`sortByDateDesc`) remains unchanged

## Reference Implementation