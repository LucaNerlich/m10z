# Client State Machines

Async and event-driven UI state is modeled as one discriminated union, not as
parallel booleans. The union makes invalid combinations unrepresentable, and a
pure transition function keeps the legal moves testable.

## Rules

1. **One union per flow.** `loading`, `ready` and `failed` are phases of the
   same thing, not independent flags.
2. **Derive from the real boundary.** Search status uses the debounced query
   (`effectiveQuery`) because that is when a request exists. A status derived
   from anything else can disagree with the network.
3. **Pure transitions.** Put the reducer/derivation next to the flow and test
   both the legal transitions and the no-ops. The component only dispatches
   events and renders phases.
4. **Exhaustive rendering.** Map a phase with `Record<Phase, ...>` or a
   `switch` that returns for every case. No cascading `if` chains that can
   silently fall through.
5. **No state-machine library.** These are local UI flows. Add one only if a
   flow must be persisted, visualized, or shared across components.

## Inventory

| Flow | Where | Model |
|------|-------|-------|
| Search | `src/components/SearchModal.tsx`, `src/hooks/useSearchQuery.ts`, `src/lib/search/searchStatus.ts` | `SearchStatus` union via `deriveSearchStatus`; `pending` wins over a stale error from the previous query. |
| Podcast player | `app/podcasts/[slug]/Player.tsx`, `playerState.ts` | `PlayerPhase` union + `playerReducer`; a loaded script without the embed global falls back instead of leaving a blank shell. |
| Stale-chunk recovery | `app/error.tsx`, `app/global-error.tsx` | `staleChunk` + `reloadBlocked`; two states, duplicated because the two boundaries render different documents. Left as-is. |
| Wichteln | `app/apps/wichteln/page.tsx` | Add/edit form plus participant/assignment lifecycle. Invariants are validated at the storage boundary (`parseWichtelnStorage`); a reducer would add ceremony without removing an invalid state. Left as-is. |
| Mermaid | `src/components/markdown/Mermaid.tsx` | Explicit reducer with `error` / `dataUrl`; already modeled. |
| Umami widget | `backend/src/plugins/umami-stats/admin/.../UmamiStatsWidget.tsx` | Explicit `Status` union (`loading` / `unconfigured` / `forbidden` / `error` / `empty` / `ready`). |
| Feed cache | `src/lib/rss/feedCache.ts` | `inflight` + `pendingRefresh` + scheduler, with reset-race tests. Internal server state; left as-is. |
| Task queues | `backend/src/services/asyncTaskQueue.ts` | Pending → running → backoff → re-queue/dead-letter, with tests. Internal server state; left as-is. |
| Header menu / search launcher | `src/components/HeaderClient.tsx`, `SearchLauncher.tsx` | Boolean open/closed. Too small to model. |
| Server retries / one-off scripts | `src/lib/strapiTransport.ts`, `backend/.../umamiClient.js`, `backend/src/scripts/migrate-audio-files.ts` | Attempt loops and script steps, not user-visible phases. Already explicit and tested. |
| Theme / font preference | `src/hooks/useStoredPreference.ts` | Stored value vs. in-session override vs. hydration gate, centralized in one hook. |
| Preview draft/published | `app/preview/[type]/[slug]/page.tsx` | Explicit `PreviewStatus` union. |

When adding a new async flow, copy the shape of `SearchStatus` or
`playerState.ts`; do not add another set of `isLoading` / `isError` /
`isSuccess` flags.
