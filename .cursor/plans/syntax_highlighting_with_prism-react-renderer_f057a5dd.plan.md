---
name: Syntax highlighting with prism-react-renderer
overview: Add syntax highlighting to markdown code blocks using prism-react-renderer v2.x, create a Code component that integrates with react-markdown, and style it with theme-aware CSS that supports all five themes (light, dark, grey, paper, hacker).
todos:
  - id: add-prism-dependency
    content: Add prism-react-renderer ^2.0.0 to frontend/package.json dependencies
    status: completed
  - id: create-code-component
    content: Create Code.tsx component in frontend/src/components/markdown/ with language extraction and Highlight integration
    status: completed
    dependencies:
      - add-prism-dependency
  - id: integrate-code-markdown
    content: Add Code component to react-markdown components object in Markdown.tsx
    status: completed
    dependencies:
      - create-code-component
  - id: create-code-styles
    content: Create Code.module.css with pre wrapper styles, token mappings, and monospace font
    status: completed
    dependencies:
      - create-code-component
  - id: extend-color-variables
    content: Add code syntax token CSS variables to colors.css for all five themes (light, dark, grey, paper, hacker)
    status: completed
  - id: update-markdown-styles
    content: Add inline code styles and code block spacing to markdown.css
    status: completed
    dependencies:
      - extend-color-variables
---

# Syntax Highlighting Implementation Plan

## Overview

Add syntax highlighting to markdown code blocks using `prism-react-renderer` v2.x (React 19 compatible), create a custom Code component, and integrate theme-aware styling across all five themes.

## Implementation Steps

### Task 1: Code Component and Integration

1. **Add dependency** to `frontend/package.json`:

- Add `"prism-react-renderer": "^2.0.0"` to dependencies

2. **Create Code component** at `frontend/src/components/markdown/Code.tsx`:

- Accept props: `className`, `children`, `inline` (from react-markdown)
- Extract language from `className` using regex pattern `/language-(\w+)/`
- For inline code or missing language: render plain `<code>` element
- For code blocks with language: use `Highlight` from `prism-react-renderer`
- Use `defaultProps` from prism-react-renderer for base configuration
- Render tokens with proper line and token props from Highlight render prop

3. **Integrate Code component** in `frontend/src/lib/markdown/Markdown.tsx`:

- Import Code component from `@/src/components/markdown/Code`
- Add `code: Code` to the `components` object passed to ReactMarkdown
- Ensure all props (node, className, children, inline) are forwarded

### Task 2: Styling and Theme Integration

4. **Create Code.module.css** at `frontend/src/components/markdown/Code.module.css`:

- Style `<pre>` wrapper: background, padding (using spacing from variables.css), border-radius, overflow-x auto
- Use monospace font variable (`--font-argon-family` or similar with fallback)
- Map prism token types to CSS custom properties:
    - `.token.keyword` → `--code-keyword`
    - `.token.string` → `--code-string`
    - `.token.comment` → `--code-comment`
    - `.token.function` → `--code-function`
    - `.token.number` → `--code-number`
    - `.token.operator` → `--code-operator`
- Enable horizontal scrolling for narrow viewports
- Apply module CSS classes to pre/code elements

5. **Extend colors.css** at `frontend/src/styles/colors.css`:

- Add code syntax token variables for each theme:
    - `--code-bg`, `--code-text` (base colors)
    - `--code-keyword`, `--code-string`, `--code-comment`, `--code-function`, `--code-number`, `--code-operator`
- Define values for: `:root` (light), `[data-theme='dark']`, `[data-theme='grey']`, `[data-theme='paper']`, `[data-theme='hacker']`
- Use oklch color format consistent with existing theme tokens
- Ensure WCAG AA contrast ratios for accessibility

6. **Update markdown.css** at `frontend/src/styles/components/markdown.css`:

- Add styles for inline `<code>` elements:
    - Subtle background using `--code-bg` or `--color-surface`
    - Padding (0.2rem 0.4rem)
    - Border-radius
    - Monospace font family
- Add spacing (margin) around code blocks (`pre` elements)
- Ensure proper color contrast using theme variables

## Technical Details

- **react-markdown API**: The `code` component receives `inline` prop (boolean), `className` (string like "language-js"), and `children` (string containing code)
- **prism-react-renderer**: Use `Highlight` component with `defaultProps`, extract language from className
- **Theme system**: CSS custom properties cascade through `data-theme` attributes, defined in `theme.css`
- **Font system**: Use `--font-argon-family` or similar monospace variables from `typography.css`
- **Spacing**: Reference `--border-radius` from `variables.css` for consistency

## Files to Modify/Create

- `frontend/package.json` - Add dependency
- `frontend/src/components/markdown/Code.tsx` - New component
- `frontend/src/components/markdown/Code.module.css` - New styles
- `frontend/src/lib/markdown/Markdown.tsx` - Integrate Code component
- `frontend/src/styles/colors.css` - Add code token variables for all themes