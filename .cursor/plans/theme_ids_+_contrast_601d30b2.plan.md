---
name: Theme IDs + contrast
overview: Rename theme identities (grey→dark, dark→night) consistently across TS/JS/CSS, then improve contrast of muted text, borders, secondary colors, and code syntax tokens with moderate adjustments and manual validation.
todos:
  - id: task1-ts-theme-ids
    content: Rename Theme/EffectiveTheme unions and THEME_OPTIONS in initTheme.ts; update system theme resolution per chosen mapping.
    status: completed
  - id: task1-blocking-script
    content: Update public/theme-init.js theme validation and system resolution to new IDs.
    status: completed
    dependencies:
      - task1-ts-theme-ids
  - id: task1-theme-selector
    content: Update ThemeSelector options to new IDs and display names (Dark/Night).
    status: completed
    dependencies:
      - task1-ts-theme-ids
  - id: task1-css-tokens
    content: "Rename CSS tokens to avoid collisions and align palettes: grey→dark and dark→night (including related secondary/shadow/code tokens)."
    status: completed
  - id: task1-css-selectors
    content: Update theme.css selectors and prefers-color-scheme mapping; ensure system dark uses new 'dark' theme and night maps to old dark palette.
    status: completed
    dependencies:
      - task1-css-tokens
  - id: task1-verify-no-stale-refs
    content: Search repo for any remaining grey/old dark references and fix until clean.
    status: completed
    dependencies:
      - task1-blocking-script
      - task1-theme-selector
      - task1-css-selectors
  - id: task2-muted-text
    content: Adjust --color-text-muted-* across themes for improved contrast and hierarchy.
    status: completed
    dependencies:
      - task1-verify-no-stale-refs
  - id: task2-borders
    content: Adjust --color-border-* across themes with clearer separation from backgrounds, especially hacker theme.
    status: completed
    dependencies:
      - task1-verify-no-stale-refs
  - id: task2-secondary-colors
    content: Increase chroma for secondary + strong secondary tokens per theme, preserving hue identity.
    status: completed
    dependencies:
      - task1-verify-no-stale-refs
  - id: task2-code-highlighting
    content: Refine code token colors across themes for contrast/differentiation while keeping hacker monochrome-green feel.
    status: completed
    dependencies:
      - task1-verify-no-stale-refs
  - id: task2-manual-spot-check
    content: Browser spot-check key pages in each theme for readability, borders, and code highlighting after adjustments.
    status: in_progress
    dependencies:
      - task2-muted-text
      - task2-borders
      - task2-secondary-colors
      - task2-code-highlighting
---

# Rename themes (grey→dark, dark→night) + improve contrast

## Goal
- **Task 1**: Atomically rename theme identities across TypeScript, the blocking `public` script, the Theme selector UI, and CSS (selectors + tokens) so there are **no mixed references**.
- **Task 2**: Improve contrast/readability by adjusting selected OKLCH values (muted text, borders, secondary colors, code tokens) **without changing overall aesthetic**.

## Key constraints / decisions
- **System dark mapping**: per your answer, when OS is dark and theme is `system`, we will resolve to **`dark` (the former `grey`)**, not `night`.
- **Contrast verification**: per your answer, we’ll do **best‑effort manual tuning + browser spot‑checks**, not automated contrast assertions.

## Task 1 — Atomic rename plan

### 1) TypeScript theme model + constants
- Update `[frontend/src/lib/theme/initTheme.ts](/Users/nerlich/workspace/luca/m10z/frontend/src/lib/theme/initTheme.ts)`:
  - **Type unions**:
    - `Theme`: replace `'grey'` → `'dark'`, replace `'dark'` → `'night'` (keeping `'system'|'light'|'paper'|'hacker'`).
    - `EffectiveTheme`: same rename (no `system`).
  - **`THEME_OPTIONS`**: update list to `['system','light','night','dark','paper','hacker']` (ordering can be tweaked, but will include both new IDs).
  - **`getSystemTheme()`**: keep return type `'light' | 'dark'` (because system dark maps to new `dark`).
  - **`resolveEffectiveTheme()`**: unchanged logic; it will return `'dark'` for system+dark OS.

### 2) Blocking pre-hydration script (FOUC prevention)
- Update `[frontend/public/theme-init.js](/Users/nerlich/workspace/luca/m10z/frontend/public/theme-init.js)`:
  - Replace validation array to exactly match TS: `['system','light','night','dark','paper','hacker']`.
  - Ensure system resolution sets `effectiveTheme` to `'dark'` on `(prefers-color-scheme: dark)`.

### 3) ThemeSelector UI
- Update `[frontend/src/components/ThemeSelector.tsx](/Users/nerlich/workspace/luca/m10z/frontend/src/components/ThemeSelector.tsx)`:
  - Replace option `{id:'grey', displayName:'Grey'}` with `{id:'dark', displayName:'Dark'}`.
  - Replace old `{id:'dark', displayName:'Dark'}` with `{id:'night', displayName:'Night'}`.
  - Keep `Theme` typing so the selector can’t emit invalid IDs.

### 4) CSS token renames (pure rename, values unchanged)
**Important discovery:** renaming `--color-*-grey → --color-*-dark` will otherwise collide with existing `--color-*-dark` tokens already used for the old “dark” palette. Therefore we will also rename the old `*-dark` tokens to `*-night` across CSS so names remain unique and semantics match the new IDs.

- Update `[frontend/src/styles/colors.css](/Users/nerlich/workspace/luca/m10z/frontend/src/styles/colors.css)`:
  - Rename all `--color-*-grey` → `--color-*-dark` (same OKLCH values).
  - Rename all `--color-*-dark` → `--color-*-night` where they represent the old dark palette (notably `--color-secondary-dark`, `--color-secondary-strong-dark`).
  - Rename all `--shadow-*-grey` → `--shadow-*-dark`.
  - Also rename the theme-suffixed code tokens for consistency with theme IDs:
    - `--code-*-grey` → `--code-*-dark`
    - `--code-*-dark` → `--code-*-night`
  - Keep all OKLCH values unchanged in Task 1.

### 5) CSS selectors + prefers-color-scheme mapping
- Update `[frontend/src/styles/theme.css](/Users/nerlich/workspace/luca/m10z/frontend/src/styles/theme.css)`:
  - Selector renames:
    - `:root[data-theme='grey']` → `:root[data-theme='dark']`
    - `:root[data-theme='dark']` → `:root[data-theme='night']`
  - Rename the *old dark* base tokens defined in this file to avoid collisions and match the new ID:
    - `--color-background-dark` → `--color-background-night`, and similarly for `surface`, `border`, `text`, `text-muted`, `link`.
    - `--code-*-dark` → `--code-*-night`.
  - Update **all** references accordingly:
    - In `@media (prefers-color-scheme: dark)`, map defaults to the system-dark theme (**new `dark`**, the former grey): it should set `--color-background: var(--color-background-dark)` etc, where `--color-background-dark` now comes from the renamed grey palette.
    - Ensure `:root[data-theme='night']` uses the renamed `*-night` base tokens.

### 6) Consistency verification (no edits yet, then after edits)
- Re-run repo search to ensure:
  - No remaining theme IDs: `grey` should be gone; `night` present; `dark` present.
  - No `data-theme='grey'` selector remains.
  - No mixed token references like `--color-*-grey` or `--color-*-dark` pointing at the wrong palette.

## Task 2 — Contrast improvements (moderate adjustments)
After Task 1 rename lands, we adjust values (OKLCH) while preserving hue character.

### 1) Muted text
- Update `--color-text-muted-*` tokens across all themes:
  - `theme.css`: `--color-text-muted-light`, `--color-text-muted-night`, and any derived references.
  - `colors.css`: `--color-text-muted-dark` (former grey), `--color-text-muted-paper`, `--color-text-muted-hacker`.
- Goal: **clear hierarchy** (primary text > muted), and **improved contrast** especially in light theme.

### 2) Borders
- Update `--color-border-*` tokens across themes.
- Ensure border lightness is more distinct from background/surface than the current ~0.11 delta, with extra attention to hacker theme.

### 3) Secondary colors
- Update `--color-secondary-*` and `--color-secondary-strong-*` across themes.
- Increase chroma from current ~0.005–0.008 into **0.015–0.03**, keeping hue stable per theme.

### 4) Code syntax highlighting
- Update all code tokens across themes:
  - `--code-keyword-*`, `--code-string-*`, `--code-comment-*`, `--code-function-*`, `--code-number-*`, `--code-operator-*`.
- Improve differentiation (esp. comment vs operator vs number).
- Keep hacker theme monochrome-green identity but introduce adequate lightness variation.

### 5) Manual validation
- Spot-check a few representative pages in the browser in each theme:
  - Body text vs muted text
  - Borders on cards/nav/inputs
  - Inline code + code blocks
  - Links + secondary surfaces

## Files we will change
- `[frontend/src/lib/theme/initTheme.ts](/Users/nerlich/workspace/luca/m10z/frontend/src/lib/theme/initTheme.ts)`
- `[frontend/public/theme-init.js](/Users/nerlich/workspace/luca/m10z/frontend/public/theme-init.js)`
- `[frontend/src/components/ThemeSelector.tsx](/Users/nerlich/workspace/luca/m10z/frontend/src/components/ThemeSelector.tsx)`
- `[frontend/src/styles/colors.css](/Users/nerlich/workspace/luca/m10z/frontend/src/styles/colors.css)`
- `[frontend/src/styles/theme.css](/Users/nerlich/workspace/luca/m10z/frontend/src/styles/theme.css)`

## Risks / gotchas to handle explicitly
- **Token name collisions**: must rename old `*-dark` → `*-night` in CSS before/alongside renaming `*-grey` → `*-dark`.
- **System theme behavior**: because system-dark maps to new `dark`, `theme-init.js` + `initTheme.ts` + CSS defaults must align.
- **Duplicated code token definitions** in both `colors.css` and `theme.css`: we will keep them consistent during Task 2 (no drift).