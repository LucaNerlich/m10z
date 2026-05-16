# CONTEXT

Domain vocabulary used by the codebase. Keep names consistent — if a concept here
is in scope of a change, use the term exactly as defined.

## M10Z

German gaming and technology blog at m10z.de. Audience-facing text is German; code,
identifiers, and comments are English.

## M12G (Mindestens 12 Games)

Monthly community game-vote: forum members nominate upcoming games for a given
month, vote on them, and the entries with the most votes are crowned that
month's winners. Each month is a single, finalized event captured as a markdown
file under `frontend/public/m12g/`.

### Month

A single finalized M12G event, identified by a `YYYY-MM` string (the **monthId**).
Holds a forum thread URL, an editorial title, and a list of nominated games. A
draft month (`finalized: false` in frontmatter) exists on disk but is not surfaced
to readers.

### Game

A nominated entry within a Month. Identified by its canonical **name** — the title
with a trailing `(Early Access)` suffix stripped and whitespace trimmed. Carries
a store link, a non-negative vote count, and an optional `earlyAccess` flag.
Names are the cross-month identity: aggregations key on the canonical name.

### Vote

Non-negative integer tally for a Game in a Month. Zero is valid (nominated but
nobody voted for it).

### Winner

The Game(s) in a Month with the highest non-zero vote count. Ties produce
multiple Winners for that Month. A Month with no votes has no Winner.

### Title defender

A Game that won the **previous** Month and was nominated again in the current
Month. Surfaces in the UI to highlight returning champions. Computed across
chronologically adjacent Months; depends only on Winner sets, not on placement
in the current Month.

### Game history

The aggregated record of one Game across every Month it appeared in: total
votes, win count, the list of Months it was nominated in, and the most recent
store link seen. Built once from a `Month[]`; views like the leaderboard and
the alphabetical game index are projections of it.
