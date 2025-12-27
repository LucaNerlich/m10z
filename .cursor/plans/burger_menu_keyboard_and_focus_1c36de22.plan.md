---
name: Burger menu keyboard and focus
overview: Add keyboard support (Space/Enter to toggle, Escape to close) and focus management (focus first link on open, restore focus on close, trap focus with Tab/Shift+Tab) to the burger menu in HeaderClient.tsx.
todos: []
---

# Burger Menu Keyboard Support and Focus Management

## Overview

Enhance the burger menu in [`frontend/src/components/HeaderClient.tsx`](frontend/src/components/HeaderClient.tsx) with keyboard accessibility and proper focus management following WCAG guidelines.

## Current State

- Burger button toggles menu via `onClick`
- Menu closes on pathname change and click outside
- No keyboard support for opening/closing
- No focus management when menu opens/closes
- No focus trapping within menu

## Implementation Plan

### Task 1: Keyboard Support

#### 1.1 Add keyboard handler to burger button

- Add `onKeyDown` handler to the burger button (line 47-54)
- Handle `Space` and `Enter` keys to toggle menu state
- Call `event.preventDefault()` for `Space` key to prevent page scrolling
- Trigger same toggle logic as `onClick` handler

#### 1.2 Add Escape key listener

- Create new `useEffect` hook that runs when `isMenuOpen` is true
- Attach `keydown` event listener to `document`
- Listen for `Escape` key and call `closeMenu()` when pressed
- Clean up event listener when menu closes or component unmounts
- Follow same pattern as existing click-outside `useEffect` (lines 24-39)

### Task 2: Focus Management

#### 2.1 Create refs

- Add `burgerButtonRef` using `useRef<HTMLButtonElement | null>(null)`
- Keep existing `menuRef` (already exists at line 20)
- Attach `burgerButtonRef` to burger button element

#### 2.2 Focus first link on menu open

- Create `useEffect` hook that runs when `isMenuOpen` becomes `true`
- Query first focusable element in menu using `menuRef.current?.querySelector('a, button')`
- Call `.focus()` on first focusable element
- Use `setTimeout` with 0ms delay to ensure menu is rendered before focusing

#### 2.3 Restore focus to burger button on close

- Extend the existing pathname `useEffect` (lines 41-43) or create new effect
- When menu closes (`isMenuOpen` becomes `false`), restore focus to `burgerButtonRef.current`
- Store previous focus state if needed to handle programmatic closes

#### 2.4 Create focusable elements helper

- Create `getFocusableElements` helper function
- Query all focusable elements: `menuRef.current?.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')`
- Return as array, filtering out disabled elements
- Use TypeScript types: `NodeListOf<HTMLElement>` or convert to array

#### 2.5 Implement focus trapping

- Extend the Escape key `useEffect` to also handle Tab key trapping
- When menu is open and Tab/Shift+Tab is pressed:
- Get all focusable elements using helper function
- Find current focused element index using `document.activeElement`
- On Tab (forward): if on last element, focus first element and prevent default
- On Shift+Tab (backward): if on first element, focus last element and prevent default
- Otherwise, allow default Tab behavior
- Only trap focus when focus is within the menu container

## Technical Details

### Key Handling

- Space key: `event.key === ' '` or `event.code === 'Space'`
- Enter key: `event.key === 'Enter'`
- Escape key: `event.key === 'Escape'`
- Tab key: `event.key === 'Tab'`

### Focus Management Pattern

- Use `requestAnimationFrame` or `setTimeout(0)` for focus operations after DOM updates
- Check element existence before calling `.focus()`
- Handle edge case where menu might have no focusable elements

### Focus Trapping Logic

```typescript
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeMenu();
    return;
  }
  
  if (event.key === 'Tab' && menuRef.current?.contains(document.activeElement)) {
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (event.shiftKey) {
      // Shift+Tab: backward
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: forward
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }
};
```



## Files to Modify

- [`frontend/src/components/HeaderClient.tsx`](frontend/src/components/HeaderClient.tsx) - Add keyboard handlers, refs, focus management, and focus trapping logic

## Testing Considerations

- Test Space/Enter on burger button opens menu
- Test Escape closes menu
- Test focus moves to first link when menu opens
- Test focus returns to burger button when menu closes