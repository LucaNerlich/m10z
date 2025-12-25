---
name: SearchModal Accessibility Enhancements
overview: Implement ARIA combobox pattern for screen reader accessibility and enhance visual focus indicators for WCAG compliance in the SearchModal component.
todos:
  - id: aria-combobox-input
    content: Add ARIA combobox attributes to input element (role, aria-autocomplete, aria-controls, aria-activedescendant, aria-expanded)
    status: completed
  - id: results-listbox-id
    content: Generate unique ID for results listbox container using useId() hook
    status: completed
  - id: result-item-ids
    content: Generate and apply unique IDs to each result item using pattern 'search-result-${idx}'
    status: completed
  - id: focus-visible-styles
    content: Add :focus-visible styles to .result with 2px solid primary color outline
    status: completed
  - id: enhance-result-active
    content: Enhance .resultActive with left border and stronger visual treatment to differentiate from hover
    status: completed
  - id: verify-contrast
    content: Verify WCAG 2.1 Level AA color contrast for all focus and active states
    status: completed
    dependencies:
      - focus-visible-styles
      - enhance-result-active
---

# SearchModal Accessibility Enhancements

## Overview

This plan implements ARIA combobox pattern attributes for screen reader accessibility and enhances visual focus indicators to meet WCAG 2.1 Level AA compliance in the SearchModal component.

## Task 1: ARIA Combobox Pattern Implementation

### Changes to `frontend/src/components/SearchModal.tsx`

1. **Add unique ID to results listbox container**

- Generate a stable ID using `useId()` hook (e.g., `const resultsId = useId()`)
- Apply `id={resultsId}` to the results container div (line 153)

2. **Add ARIA attributes to input element** (lines 139-147)

- Add `role="combobox"`
- Add `aria-autocomplete="list"`
- Add `aria-controls={resultsId}` to reference the listbox
- Add `aria-activedescendant` that conditionally references the active result ID:
    - When `activeIndex >= 0` and results exist: `aria-activedescendant={`search-result-${activeIndex}`}`
    - When no active result: `aria-activedescendant={undefined}` or omit the attribute
- Add `aria-expanded={results.length > 0}` to indicate when results are available

3. **Generate unique IDs for result items** (lines 156-202)

- Use pattern `search-result-${idx}` for each result item's `id` attribute
- Apply `id={`search-result-${idx}`}` to each button element (line 157)

4. **Verify aria-selected implementation**

- Current implementation (line 164) is correct: `aria-selected={idx === activeIndex}`
- Ensure it remains boolean (true/false, not string)

5. **Enhance listbox aria-label**

- Current `aria-label="Suchergebnisse"` (line 153) is appropriate
- Consider adding `aria-live="polite"` to the status message container for dynamic updates

## Task 2: Visual Focus Indicators Enhancement

### Changes to `frontend/src/components/SearchModal.module.css`

1. **Add :focus-visible styles to .result** (after line 79)

- Add `.result:focus-visible` selector with:
    - `outline: 2px solid var(--color-primary)`
    - `outline-offset: -2px` (to align with border)
    - Ensure sufficient contrast (primary color meets WCAG AA)

2. **Enhance .resultActive styling** (lines 81-83)

- Add stronger visual treatment:
    - `background: var(--color-surface-strong)` (already present)
    - Add `border-left: 3px solid var(--color-primary)` to differentiate from hover
    - Add `box-shadow: inset 0 0 0 1px var(--color-primary)` for additional emphasis
    - Or use `border-left` + subtle background color change

3. **Improve .result:hover styling** (lines 77-79)

- Keep existing `background: var(--color-surface-strong)`
- Ensure it doesn't conflict with `.resultActive` when both are applied
- Add subtle transition for smooth state changes

4. **Differentiate keyboard focus from mouse hover**

- `.resultActive` should have stronger styling (left border + background)
- `.result:hover` should have lighter styling (background only)
- When `.resultActive` is applied, it should visually override hover state

5. **Ensure WCAG 2.1 Level AA contrast**

- Verify `--color-primary` contrast against `--color-surface-strong` background
- Verify text color (`--color-text`) contrast in all states
- Primary color (oklch(0.687 0.175 45.092)) should meet 3:1 contrast ratio for UI components

6. **Remove any outline: none declarations**

- Verify no `outline: none` exists in `.result` styles (currently none found)

## Implementation Details

### ARIA Combobox Pattern

- Input acts as combobox control
- Listbox contains selectable options
- `aria-activedescendant` creates relationship between input and active option
- Screen readers will announce: "combobox, autocomplete list" and read active option

### Focus Indicator Strategy

- `:focus-visible` shows outline only for keyboard navigation
- `.resultActive` provides persistent visual indicator for keyboard-selected item
- Left border on `.resultActive` differentiates from mouse hover
- Both states can coexist without visual conflict

## Testing Considerations

- Test with screen reader (NVDA/JAWS/VoiceOver) to verify ARIA announcements
- Test keyboard navigation (Arrow keys, Enter, Escape)
- Verify focus indicators are visible in both light and dark modes