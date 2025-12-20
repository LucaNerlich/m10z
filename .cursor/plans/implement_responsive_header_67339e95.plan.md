---
name: Implement responsive header
overview: Add responsive site header with logo/home link, center nav links, and burger menu with design-system styling and close-on-interaction behavior.
todos:
  - id: audit-tokens
    content: Review existing layout/nav components and design tokens
    status: completed
  - id: build-header
    content: Implement header structure and styling with responsive links
    status: completed
    dependencies:
      - audit-tokens
  - id: wire-behavior
    content: Add menu toggle, outside-click/route-change close and a11y
    status: completed
    dependencies:
      - build-header
---

# Implement Responsive Header

## Steps
1) Inspect existing layout/nav patterns and design tokens to align styles and breakpoints (`frontend/app` layout and shared components/tokens).  
2) Add/extend a header component (e.g., `frontend/app/components/Header.tsx`) with home/logo link left, center links (`Artikel`, `Podcasts`), and a burger-triggered menu (desktop shows extra links; mobile may also include main links if space is tight).  
3) Wire interactive behavior: toggleable, accessible burger (focus trap/aria), close on outside click or link navigation, and responsive visibility at the md breakpoint.

## Todos
- audit-tokens: Review existing layout/nav components and design tokens.
- build-header: Implement header structure and styling with responsive links.
- wire-behavior: Add menu toggle, outside-click/route-change close, and accessibility.