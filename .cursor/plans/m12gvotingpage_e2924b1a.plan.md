---
name: M12GVotingPage
overview: Set up a markdown-backed M12G data layer and build the statistics page with reusable month cards, keeping the current-month exclusion and a future-friendly API contract.
todos:
  - id: types-loader
    content: Add M12G types + markdown loader with winners/sorting
    status: completed
  - id: ui-components
    content: Build M12GMonthCard + page using ContentGrid
    status: completed
  - id: routing-nav
    content: Add m12g route and footer link
    status: completed
---

# M12G Data + Stats Page Plan

## Data model and loading

- Add types in [frontend/src/lib/m12g/types.ts](frontend/src/lib/m12g/types.ts) for `M12GGame`, `M12GMonth`, `M12GMonthWithWinner`, and `M12GOverview`.
- Implement a markdown parser in [frontend/src/lib/m12g/m12gData.ts](frontend/src/lib/m12g/m12gData.ts) that:
- Reads `frontend/public/m12g/*.md` files, extracts `forum` from YAML frontmatter, and parses list items into `{name, link, votes}` (votes optional → `0` if missing).
- Uses the filename (`YYYY-MM.md`) as the month id, filters out the current month, sorts desc, and computes `winner` per month.
- Keep `fetchM12GOverview()` as the single entry point and return `M12GOverview` for a clean future CMS swap.

## UI components and page

- Create [frontend/src/components/M12GMonthCard.tsx](frontend/src/components/M12GMonthCard.tsx) + CSS module, following card patterns from team pages and using semantic HTML.
- Build the page in [frontend/app/m12g/page.tsx](frontend/app/m12g/page.tsx) as a server component:
- Add static `metadata` title/description.
- Use `ContentGrid` for layout, render a list of `M12GMonthCard`, and show `EmptyState` when no data.
- Ensure external links use `target="_blank"` + `rel="noreferrer noopener"`.

## Routing + navigation

- Add a `m12g` route to [frontend/src/lib/routes.ts](frontend/src/lib/routes.ts).
- Add a footer link in [frontend/src/components/Footer.tsx](frontend/src/components/Footer.tsx) under “Inhalte” or a new section, depending on layout fit.

## Notes

- Markdown schema: YAML frontmatter `forum: <url>`; list items formatted as `* [Name](link) votes` (votes optional).
- Current month exclusion: compare to `new Date()` in server runtime and exclude matching `YYYY-MM` filename.