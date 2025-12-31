---
name: Fix React 418 Hydration Issues Caused by Locale-Dependent Date Formatting
overview: ""
todos:
  - id: create-manual-formatter
    content: Create manual German date formatter functions to replace toLocaleDateString in formatDateFull and formatDateShort
    status: completed
  - id: update-formatDateFull
    content: Update formatDateFull to use manual formatter instead of toLocaleDateString
    status: completed
    dependencies:
      - create-manual-formatter
  - id: update-formatDateShort
    content: Update formatDateShort to use manual formatter instead of toLocaleDateString
    status: completed
    dependencies:
      - create-manual-formatter
  - id: verify-no-other-issues
    content: Verify no other locale-dependent APIs are causing hydration issues
    status: completed
    dependencies:
      - update-formatDateFull
      - update-formatDateShort
---

# Fix React 418 Hydration Issues Caused by Locale-Dependent Date Formatting

## Problem

The app is experiencing React 418 hydration errors and CPU spikes on the deployed Docker server (but not locally) because `formatDateShort` and `formatDateFull` use `toLocaleDateString` with `GERMAN_LOCALE`. Alpine Linux containers typically lack full ICU locale data, causing the server to format dates differently than the client browser, leading to hydration mismatches and infinite re-render loops.

## Root Cause

- `formatDateShort` and `formatDateFull` in [`frontend/src/lib/dateFormatters.ts`](frontend/src/lib/dateFormatters.ts) use `toLocaleDateString(GERMAN_LOCALE, ...)` 
- Alpine Linux Docker containers don't have German locale data installed by default
- Server renders dates in one format (fallback locale), client renders in another (German locale)
- React detects mismatch → hydration error → re-render → mismatch again → CPU spike

## Solution

Replace locale-dependent `toLocaleDateString` calls with a deterministic manual formatter that produces identical output on server and client, regardless of locale configuration.

## Implementation Steps

1. **Create deterministic German date formatter** in [`frontend/src/lib/dateFormatters.ts`](frontend/src/lib/dateFormatters.ts):

- Replace `toLocaleDateString` calls with manual formatting logic
- Use hardcoded German month names and formatting patterns
- Ensure identical output regardless of runtime locale settings

2. **Update `formatDateFull`**:

- Format: "15. Januar 2024" (day. month year)
- Use manual month name mapping instead of `toLocaleDateString`

3. **Update `formatDateShort`**:

- Format: "15. Jan. 2024" (day. abbreviatedMonth year)
- Use manual abbreviated month name mapping

4. **Keep `formatDateRelative` unchanged** (not currently used, but fix if needed later):

- This function uses `new Date()` which could cause issues if used
- For now, document that it should only be used client-side

5. **Verify no other locale-dependent APIs**:

- Check `Intl.ListFormat` usage in [`frontend/src/lib/listFormatters.ts`](frontend/src/lib/listFormatters.ts) - this is less likely to cause hydration issues as it's used for author lists, but should be monitored

## Files to Modify

- [`frontend/src/lib/dateFormatters.ts`](frontend/src/lib/dateFormatters.ts) - Replace `toLocaleDateString` with manual formatting

## Testing Strategy

1. Test locally to ensure formatting still works correctly
2. Deploy to Docker and verify hydration errors are resolved
3. Monitor CPU usage to confirm spikes are gone
4. Verify dates display correctly in German format on all pages

## Additional Considerations

- The manual formatter will be more predictable and won't depend on system locale configuration