---
name: Layout Primitive Components Refactor
overview: Create reusable layout primitive components (Card, Section, EmptyState, Pagination, Player) and integrate them across all pages, replacing page-level styling patterns with consistent component-based architecture.
todos:
  - id: create-card-component
    content: Create Card.tsx and Card.module.css with variant support and grid layout for media-containing cards
    status: pending
  - id: create-section-component
    content: Create Section.tsx and Section.module.css with optional title prop and flexbox column layout
    status: pending
  - id: create-emptystate-component
    content: Create EmptyState.tsx and EmptyState.module.css with muted text styling and center alignment
    status: pending
  - id: create-pagination-component
    content: Create Pagination.tsx and Pagination.module.css with page navigation buttons and disabled states
    status: pending
  - id: create-player-component
    content: Create Player.tsx and Player.module.css with card-like styling and accessibility attributes
    status: pending
  - id: update-home-page
    content: Replace card, pagination, and empty state markup in frontend/app/page.tsx with new components
    status: pending
    dependencies:
      - create-card-component
      - create-pagination-component
      - create-emptystate-component
  - id: update-article-page
    content: Replace header markup in frontend/app/artikel/[slug]/page.tsx with Section component
    status: pending
    dependencies:
      - create-section-component
  - id: update-podcast-page
    content: Replace player container and header in frontend/app/podcasts/[slug]/page.tsx with Player and Section components
    status: pending
    dependencies:
      - create-player-component
      - create-section-component
  - id: update-category-page
    content: Replace section and empty state markup in frontend/app/kategorien/[slug]/page.tsx with components
    status: pending
    dependencies:
      - create-section-component
      - create-emptystate-component
  - id: update-team-page
    content: Replace section and empty state markup in frontend/app/team/[slug]/page.tsx with components
    status: pending
    dependencies:
      - create-section-component
      - create-emptystate-component
  - id: cleanup-page-css
    content: Remove obsolete CSS classes from all page.module.css files after component integration
    status: pending
    dependencies:
      - update-home-page
      - update-article-page
      - update-podcast-page
      - update-category-page
      - update-team-page
  - id: delete-orphaned-files
    content: Delete frontend/app/artikel/page.module.css and frontend/app/podcasts/page.module.css
    status: pending
    dependencies:
      - cleanup-page-css
---

# Layout Primitive Componen

ts Refactor

## Overview

Refactor the frontend to use reusable layout primitive components, replacing page-level styling patterns with a consistent component-based architecture. This will improve maintainability and ensure visual consistency across pages.

## Architecture

The refactor follows this structure:

- **Foundational primitives**: Card, Section, EmptyState (layout building blocks)
- **Specialized components**: Pagination, Player (functional components with specific behavior)
- **Integration**: Replace inline styles and page-level CSS classes with component usage

## Implementation Plan

### Task 1: Create Foundational Layout Components

#### 1.1 Card Component

**File**: `frontend/src/components/Card.tsx` and `frontend/src/components/Card.module.css`

- Accept props: `children`, `className?`, `variant?: 'default' | 'empty'`
- Use CSS variables: `--color-border`, `--color-surface`, `--border-radius`, `--shadow-soft`
- Support grid layout for media-containing cards (matching current `.card` styles from `frontend/app/page.module.css`)
- Apply border, background, border-radius, and shadow using theme variables
- Support className composition for extending styles

**Key styles to replicate**:

- Grid layout: `grid-template-columns: 280px 1fr` (desktop), `1fr` (mobile)
- Border, background, shadow from theme
- Responsive breakpoint at 1080px

#### 1.2 Section Component

**File**: `frontend/src/components/Section.tsx` and `frontend/src/components/Section.module.css`

- Accept props: `children`, `title?`, `className?`
- Render title in semantic `<header>` element when provided
- Use flexbox column layout with consistent gap spacing
- Apply margin-bottom for spacing between sections

**Key styles**:

- Flexbox column layout
- Gap spacing (matching current `margin-bottom: 3rem` pattern)
- Title styling with appropriate margins

#### 1.3 EmptyState Component

**File**: `frontend/src/components/EmptyState.tsx` and `frontend/src/components/EmptyState.module.css`

- Accept props: `message`, `className?`
- Apply muted text styling using `--color-text-muted`
- Center-align content with appropriate padding
- Support dashed border variant (for empty card states)

**Key styles**:

- Muted text color
- Center alignment
- Padding (matching current `.emptyCard` styles)

### Task 2: Create Specialized Functional Components

#### 2.1 Pagination Component

**File**: `frontend/src/components/Pagination.tsx` and `frontend/src/components/Pagination.module.css`

- Accept props: `currentPage`, `totalPages`, `onPrevious`, `onNext`, `className?`
- Render navigation buttons with disabled states for first/last page
- Display page information between navigation buttons (e.g., "Seite {currentPage}")
- Use flexbox layout with gap spacing
- Apply theme button styling (border, border-radius, background)

**Key styles**:

- Flexbox layout with space-between for info and controls
- Button styling matching current `.pageButton` styles
- Disabled state with opacity and pointer-events

#### 2.2 Player Component

**File**: `frontend/src/components/Player.tsx` and `frontend/src/components/Player.module.css`

- Accept props: `children`, `className?`
- Apply card-like styling (border, shadow, border-radius)
- Use semantic `<div>` with `role="region"` and `aria-label="Audio player"`
- Include padding matching existing player container styles (`padding: 1.5rem`)

**Note**: This replaces the local `PodcastPlayer` wrapper div styling. The existing `PodcastPlayer` component will wrap its content in this new `Player` component.

### Task 3: Integrate Components into Pages

#### 3.1 Update `frontend/app/page.tsx`

- Import `Card`, `Pagination`, `EmptyState` components
- Replace `<article className={styles.card}>` with `<Card>` component
- Replace pagination markup (`<nav className={styles.pagination}>`) with `<Pagination>` component
- Replace empty state divs with `<EmptyState>` component
- Keep feed TOC styles in `page.module.css` (these are page-specific)
- Remove classes from `page.module.css`: `.card`, `.cardBody`, `.cardTitle`, `.pagination`, `.pageButton`, `.pageButtonDisabled`, `.pageInfo`, `.pageControls`, `.emptyCard`, `.emptyState`

**Card integration details**:

- The card currently has nested structure: `.media` div, `.cardBody` div
- Card component should accept children, so structure becomes: `<Card><div className={styles.media}>...</div><div>...</div></Card>`
- Or create a variant that handles the grid layout internally

#### 3.2 Update `frontend/app/artikel/[slug]/page.tsx`

- Import `Section` component
- Wrap article header (`<header className={styles.header}>`) in `<Section>` component
- Remove `.header` border-bottom styling from `page.module.css` (move to Section if needed, or handle via className)

#### 3.3 Update `frontend/app/podcasts/[slug]/page.tsx`

- Import `Player` and `Section` components
- Update `PodcastPlayer` to use new `Player` component, or replace the wrapper div with `<Player>` in the page
- Use `Section` for episode header (similar to article page)
- Remove `.header` and `.player` classes from `page.module.css`

**Note**: The existing `PodcastPlayer` component at `frontend/app/podcasts/[slug]/Player.tsx `will need to be updated to use the new `Player` wrapper component.

#### 3.4 Update `frontend/app/kategorien/[slug]/page.tsx`

- Import `Section` and `EmptyState` components
- Replace `<section className={styles.section}>` with `<Section title="...">`
- Replace empty state paragraph with `<EmptyState message="...">`
- Remove `.section`, `.sectionTitle`, `.emptyState` classes from `page.module.css`

#### 3.5 Update `frontend/app/team/[slug]/page.tsx`

- Import `Section` and `EmptyState` components
- Replace `<section className={styles.section}>` with `<Section title="...">`
- Replace empty state paragraph with `<EmptyState message="...">`
- Remove `.section`, `.sectionTitle`, `.emptyState` classes from `page.module.css`

### Task 4: Clean Up Orphaned Files

#### 4.1 Delete unused CSS files

- Delete `frontend/app/artikel/page.module.css` (not imported, confirmed unused)
- Delete `frontend/app/podcasts/page.module.css` (not imported, confirmed unused)

#### 4.2 Verify no imports exist

- Search codebase for imports of deleted files (already verified via grep - no matches found)

## Component API Specifications

### Card Component

```typescript
type CardProps = {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'empty';
};
```



### Section Component

```typescript
type SectionProps = {
  children: ReactNode;
  title?: string;
  className?: string;
};
```



### EmptyState Component

```typescript
type EmptyStateProps = {
  message: string;
  className?: string;
};
```



### Pagination Component

```typescript
type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
};
```



### Player Component

```typescript
type PlayerProps = {
  children: ReactNode;
  className?: string;
};
```



## Migration Strategy

1. **Create components first** - Build all new components with their CSS modules
2. **Update pages incrementally** - Start with simpler pages (kategorien, team), then move to more complex ones (page.tsx, podcasts)
3. **Preserve existing behavior** - Ensure visual appearance remains identical after migration
4. **Remove obsolete styles** - Clean up CSS classes only after confirming components work correctly

## Testing Considerations

- Verify responsive behavior matches current implementation
- Ensure theme variables work correctly in both light and dark modes