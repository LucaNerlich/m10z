---
name: Font Picker Implementation
overview: Implement a font picker component in the footer that allows users to select from multiple font options, with selection persisted in localStorage and applied globally. Migrate font loading from CSS @font-face to next/font for optimization.
todos:
  - id: task1-fonts-config
    content: Create fonts.ts with next/font configurations for Poppins (default) and Monaspace variable fonts (Argon, Krypton, Neon, Radon, Xenon) from /public/fonts
    status: pending
  - id: task1-typography-css
    content: Update typography.css to define CSS custom properties for each font and remove @font-face declarations
    status: pending
    dependencies:
      - task1-fonts-config
  - id: task1-layout-integration
    content: Update layout.tsx to import and apply font className variables to html element
    status: pending
    dependencies:
      - task1-fonts-config
  - id: task2-fontpicker-component
    content: Create FontPicker.tsx with localStorage persistence and SSR-safe hydration following ThemeToggle pattern
    status: pending
    dependencies:
      - task1-layout-integration
  - id: task2-fontpicker-styles
    content: Create FontPicker.module.css with styling matching ThemeToggle and theme compatibility
    status: pending
    dependencies:
      - task2-fontpicker-component
  - id: task3-footer-integration
    content: Integrate FontPicker into Footer component and update Footer.module.css if needed
    status: pending
    dependencies:
      - task2-fontpicker-styles
---

# Font Picker Implementation Plan

## Overview

Add a font picker component to the footer that allows users to select from multiple font options, with the selection persisted in localStorage and applied globally across the application. Migrate font loading from CSS @font-face to Next.js font optimization.

## Architecture

The implementation follows three phases:

1. **Font Loading Migration**: Move from CSS @font-face to `next/font` (Google Fonts API and local fonts)
2. **FontPicker Component**: Build a client component with localStorage persistence, following the ThemeToggle pattern
3. **Integration**: Add FontPicker to Footer component with proper styling

### Font Selection Flow

```javascript
User selects font → FontPicker updates state → Updates CSS custom property → Persists to localStorage → Applied globally via CSS variable
```



## Implementation Tasks

### Task 1: Migrate Font Loading to next/font

**Create `frontend/src/styles/fonts.ts`:**

- Import Poppins using `next/font/google` or `localFont` from `next/font/local` (since files exist in `public/fonts/`)
- Import Monaspace variable fonts using `localFont` from `next/font/local`:
- MonaspaceArgonVar.woff2
- MonaspaceKryptonVar.woff2
- MonaspaceNeonVar.woff2
- MonaspaceRadonVar.woff2
- MonaspaceXenonVar.woff2
- Configure each font with:
- Appropriate weights (400, 700 for Poppins; variable fonts support full range)
- `display: 'swap'` for performance
- CSS variable names (e.g., `--font-poppins`, `--font-argon`, `--font-krypton`, etc.)
- `preload: false` for non-default fonts to optimize initial load
- Export all font instances

**Update `frontend/src/styles/typography.css`:**

- Remove existing `@font-face` declarations for Poppins
- Define CSS custom properties for each font option:
  ```css
    :root {
      --font-poppins: var(--font-poppins), Arial, sans-serif;
      --font-argon: var(--font-argon), 'Courier New', monospace;
      --font-krypton: var(--font-krypton), 'Courier New', monospace;
      --font-neon: var(--font-neon), 'Courier New', monospace;
      --font-radon: var(--font-radon), 'Courier New', monospace;
      --font-xenon: var(--font-xenon), 'Courier New', monospace;
      --font-family: var(--font-poppins); /* Default */
    }
  ```




- Keep `--font-family` as the active selection variable
- Maintain existing body font-family reference

**Update `frontend/app/layout.tsx`:**

- Import font configurations from `frontend/src/styles/fonts.ts`
- Apply all font className variables to the `<html>` element
- Ensure fonts are available as CSS variables for the FontPicker component

### Task 2: Build FontPicker Component

**Create `frontend/src/components/FontPicker.tsx`:**

- Mark as client component with `'use client'` directive
- Define `STORAGE_KEY` constant: `'m10z-font-family'`
- Create TypeScript interface:
  ```typescript
    interface FontOption {
      id: string;
      displayName: string;
      cssVariable: string;
    }
  ```




- Define array of available fonts matching Task 1 configuration:
- Poppins (default)
- Monaspace Argon
- Monaspace Krypton
- Monaspace Neon
- Monaspace Radon
- Monaspace Xenon
- Implement state management:
- `useState` for selected font ID with default 'poppins'
- `useState` for hydration flag (prevents SSR mismatch)
- Create `applyFont` function:
- Updates `--font-family` CSS custom property on `document.documentElement`
- Uses the CSS variable reference (e.g., `var(--font-poppins)`)
- Add `useEffect` hooks:
- First effect: Hydrates from localStorage on mount, applies stored font or default
- Second effect: Applies font changes and persists to localStorage (only after hydration)
- Conditionally render select element only after hydration is complete
- Use `<select>` element with proper ARIA labels
- Map font options to `<option>` elements with value={id}

**Create `frontend/src/components/FontPicker.module.css`:**

- Style select element to match ThemeToggle aesthetic
- Use CSS custom properties from `variables.css`, `colors.css`, and `theme.css`
- Set `font-family` to use the selected font for preview
- Match ThemeToggle styling:
- Similar padding, border-radius, background
- Use `var(--color-text-muted)` for default color
- Hover state: `var(--color-primary)`
- Focus state with proper outline
- Ensure light/dark theme compatibility
- Add responsive behavior for mobile viewports
- Font size: `0.95rem` to match ThemeToggle

### Task 3: Integrate FontPicker into Footer

**Update `frontend/src/components/Footer.tsx`:**

- Import FontPicker component
- Add FontPicker to `metaRow` div, positioned before ThemeToggle
- Maintain existing structure and spacing

**Update `frontend/src/components/Footer.module.css`:**

- Ensure `.metaRow` gap spacing accommodates both components (currently `14px`)
- Verify flex-wrap behavior works with additional component
- No changes needed if current spacing is sufficient

**Update `frontend/src/components/FontPicker.module.css`:**

- Final styling polish to ensure visual cohesion
- Verify spacing matches ThemeToggle in footer context
- Test responsive behavior in footer layout

## Testing Checklist

- [ ] Font persistence across page reloads
- [ ] Font persistence across navigation
- [ ] SSR behavior without hydration errors
- [ ] Independent operation of font selection and theme toggle
- [ ] Immediate font application without page reload
- [ ] No CLS (Cumulative Layout Shift) issues from font loading
- [ ] All fonts load correctly via next/font
- [ ] Font preview in dropdown shows correct font family
- [ ] Light and dark theme compatibility
- [ ] Responsive behavior on mobile devices

## Files to Modify

- `frontend/src/styles/fonts.ts` (new)
- `frontend/src/styles/typography.css`
- `frontend/app/layout.tsx`
- `frontend/src/components/FontPicker.tsx` (new)
- `frontend/src/components/FontPicker.module.css` (new)
- `frontend/src/components/Footer.tsx`
- `frontend/src/components/Footer.module.css`

## Notes

- Font selection follows the same pattern as ThemeToggle for consistency
- Default font remains Poppins to maintain current design
- Monaspace fonts are variable fonts that support the full weight range
- All fonts use `display: 'swap'` to prevent invisible text during font load
- Non-default fonts use `preload: false` to optimize initial page load