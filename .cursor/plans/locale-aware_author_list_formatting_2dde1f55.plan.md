---
name: Locale-aware author list formatting
overview: Create a new list formatting utility module using Intl.ListFormat for German locale-aware author list formatting, and integrate it into the AuthorList component to replace manual comma separator logic.
todos:
  - id: create-list-formatters
    content: Create frontend/src/lib/listFormatters.ts with GERMAN_LOCALE constant and formatAuthorList function using Intl.ListFormat
    status: completed
  - id: integrate-author-list
    content: Update AuthorList component to import and use formatAuthorList, replacing manual separator logic in inline layout
    status: completed
    dependencies:
      - create-list-formatters
---

# Locale-aware author list formatting

## Overview

Replace manual comma separator logic in the AuthorList component with a locale-aware list formatting utility using `Intl.ListFormat`. This will provide proper German list formatting (e.g., "Alice, Bob und Charlie" instead of "Alice, Bob, Charlie").

## Implementation

### Task 1: Create list formatting utility

Create [`frontend/src/lib/listFormatters.ts`](frontend/src/lib/listFormatters.ts):

- Define `GERMAN_LOCALE` constant as `'de-DE'`
- Export `formatAuthorList` function:
- Accepts `authorNames: string[]` parameter
- Creates `Intl.ListFormat` instance with:
    - Locale: `GERMAN_LOCALE`
    - Type: `'conjunction'`
    - Style: `'long'`
- Returns `formatToParts(authorNames)` result
- Add JSDoc documentation explaining the function's purpose and return type

The function will return an array of `Intl.ListFormatPart` objects with `type` ('element' or 'literal') and `value` properties.

### Task 2: Integrate into AuthorList component

Modify [`frontend/src/components/AuthorList.tsx`](frontend/src/components/AuthorList.tsx):**Changes to inline layout section (lines 64-96):**

1. Import `formatAuthorList` from `@/src/lib/listFormatters`
2. Extract author names array from `displayAuthors`:

- Map over `displayAuthors` to get `author.title ?? 'Unbekannter Autor'`

3. Replace the current `.map()` logic (lines 67-91) with:

- Call `formatAuthorList(authorNames)` to get formatted parts
- Map over the parts array:
    - For `part.type === 'element'`:
    - Find the corresponding author object by maintaining an index counter
    - Render the existing author span structure (avatar + link) with the same styling
    - Use the same key strategy (`author.id ?? index`)
    - For `part.type === 'literal'`:
    - Render a plain text `<span>` with `className={styles.separator}` containing `part.value`

4. Preserve existing functionality:

- Keep avatar rendering logic (`showAvatars` check)
- Keep the "und X weitere" logic for `remainingCount > 0` (line 92-94)
- Maintain all existing CSS classes and styling
- Keep block layout mode completely unchanged (lines 31-62)

**TypeScript considerations:**

- The return type of `formatToParts()` is `Intl.ListFormatPart[]` where each part has:
- `type: 'element' | 'literal'`
- `value: string`
- Ensure proper typing for the parts array iteration

## Notes