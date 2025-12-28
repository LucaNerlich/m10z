---
name: UTC Date Standardization and Validation
overview: Standardize all user-facing date displays to treat UTC timestamps as calendar dates, and validate RSS feed compliance. The date formatters already use UTC parsing, but need enhanced documentation. The homepage needs to replace its custom date formatter with the standardized one.
todos:
  - id: enhance-jsdoc
    content: Enhance JSDoc comments in dateFormatters.ts to document calendar date behavior for parseDateAsUtcDateOnly() and all formatting functions
    status: completed
  - id: update-homepage
    content: Remove custom formatDate() function from page.tsx, import formatDateShort, and replace all formatDate() calls
    status: completed
  - id: verify-rss
    content: Verify RSS feed compliance - confirm formatRssDate() uses toUTCString() and both feeds use it correctly
    status: completed
  - id: test-dates
    content: Test UTC midnight dates, timezone boundaries, and relative date formatting across all components
    status: completed
    dependencies:
      - enhance-jsdoc
      - update-homepage
---

# UTC Date Standardization and Validation Plan

## Overview

This plan standardizes user-facing date displays to treat UTC timestamps as calendar dates and validates RSS feed compliance. Most components already use the correct formatters; the main work is updating the homepage and enhancing documentation.

## Current State Analysis

### Already Compliant

- `formatDateShort()`, `formatDateFull()`, and `formatDateRelative()` in [`frontend/src/lib/dateFormatters.ts`](frontend/src/lib/dateFormatters.ts) already call `parseDateAsUtcDateOnly()` 
- `parseDateAsUtcDateOnly()` correctly extracts YYYY-MM-DD and creates UTC Date objects
- `ArticleCard`, `PodcastCard`, and `ContentMetadata` components already use `formatDateShort()`
- RSS feeds are compliant: `formatRssDate()` uses `toUTCString()` and both `articlefeed.ts` and `audiofeed.ts` use it correctly
- `formatIso8601Date()` in [`frontend/src/lib/jsonld/helpers.ts`](frontend/src/lib/jsonld/helpers.ts) remains unchanged (as required)

### Needs Updates

- [`frontend/app/page.tsx`](frontend/app/page.tsx) has a custom `formatDate()` function (lines 79-84) that doesn't use UTC date parsing
- JSDoc comments in `dateFormatters.ts` could better document calendar date behavior

## Implementation Tasks

### Task 1: Standardize Date Displays

#### 1.1 Enhance JSDoc Documentation

**File:** [`frontend/src/lib/dateFormatters.ts`](frontend/src/lib/dateFormatters.ts)

- Enhance `parseDateAsUtcDateOnly()` JSDoc to explicitly document that it treats UTC timestamps as calendar dates
- Add calendar date behavior notes to `formatDateShort()`, `formatDateFull()`, and `formatDateRelative()` JSDoc comments
- Clarify that these functions ensure dates display consistently regardless of user timezone

#### 1.2 Update Homepage Date Formatting

**File:** [`frontend/app/page.tsx`](frontend/app/page.tsx)

- Remove the custom `formatDate()` function (lines 79-84)
- Add import: `import {formatDateShort} from '@/src/lib/dateFormatters';`
- Replace all `formatDate(raw)` calls with `formatDateShort(raw)`:
- Line 206: TOC date display
- Line 209: TOC date fallback
- Line 265: Feed card date display

### Task 2: Validation Phase

#### 2.1 Verify RSS Feed Compliance

**Files to verify:**

- [`frontend/src/lib/rss/xml.ts`](frontend/src/lib/rss/xml.ts) - Confirm `formatRssDate()` uses `toUTCString()` ✓ (already compliant)
- [`frontend/src/lib/rss/articlefeed.ts`](frontend/src/lib/rss/articlefeed.ts) - Confirm uses `formatRssDate()` for `<pubDate>` ✓ (line 107)
- [`frontend/src/lib/rss/audiofeed.ts`](frontend/src/lib/rss/audiofeed.ts) - Confirm uses `formatRssDate()` for `<pubDate>` ✓ (line 128, 151)

**Action:** Document verification in comments or confirm no changes needed

#### 2.2 Testing Checklist

After implementation, verify:

1. **UTC Midnight Dates**: Test dates like `2024-12-25T00:00:00Z` display as "25. Dez. 2024" regardless of user timezone
2. **Timezone Boundaries**: Test dates at various UTC times (e.g., `2024-12-25T23:00:00Z`) display correct calendar date
3. **Component Consistency**: Verify dates display consistently in:

- Homepage (`page.tsx`) - TOC and feed cards
- `ArticleCard` component
- `PodcastCard` component  
- `ContentMetadata` component

4. **Relative Date Formatting**: Test `formatDateRelative()` at timezone boundaries (e.g., "heute", "gestern", "morgen")
5. **RSS Feed Dates**: Verify RSS feeds use RFC 2822 format via `toUTCString()`

## Files to Modify

1. [`frontend/src/lib/dateFormatters.ts`](frontend/src/lib/dateFormatters.ts) - Enhance JSDoc comments
2. [`frontend/app/page.tsx`](frontend/app/page.tsx) - Remove custom formatter, use standardized one

## Files to Verify (No Changes Expected)

1. [`frontend/src/lib/rss/xml.ts`](frontend/src/lib/rss/xml.ts) - RSS date formatting
2. [`frontend/src/lib/rss/articlefeed.ts`](frontend/src/lib/rss/articlefeed.ts) - Article feed dates
3. [`frontend/src/lib/rss/audiofeed.ts`](frontend/src/lib/rss/audiofeed.ts) - Audio feed dates
4. [`frontend/src/lib/jsonld/helpers.ts`](frontend/src/lib/jsonld/helpers.ts) - ISO 8601 formatting (unchanged)

## Testing Strategy

1. **Manual Testing**: Test date displays with various UTC timestamps across different timezones
2. **Component Testing**: Verify all date displays use consistent formatting