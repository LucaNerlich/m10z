# Strapi public API permissions and tokens

This document records the **Users & Permissions** configuration shipped in config sync so reviewers can verify **least privilege** without opening the Strapi admin UI. It complements the SQL-injection review: anonymous clients only receive what the **Public** role allows.

## Source of truth

| Role | Config sync file |
|------|------------------|
| Public (unauthenticated) | [`config/sync/user-role.public.json`](../config/sync/user-role.public.json) |
| Authenticated | [`config/sync/user-role.authenticated.json`](../config/sync/user-role.authenticated.json) |

After changing permissions in Strapi, export/sync so these files stay accurate.

## Public role (unauthenticated)

**Content API — read only.** The Public role grants `find` and `findOne` on published content types only (articles, podcasts, authors, categories, single types for legal/about/feeds, search index). There are **no** `create`, `update`, or `delete` actions on collection types.

| Area | Actions |
|------|---------|
| `api::article.*`, `api::podcast.*`, `api::author.*`, `api::category.*` | `find`, `findOne` |
| `api::about.about`, `api::about-feed.about-feed`, `api::article-feed.article-feed`, `api::audio-feed.audio-feed` | `find` |
| `api::imprint.imprint`, `api::privacy.privacy` | `find` |
| `api::search-index.search-index` | `find`, `metrics` |
| `plugin::upload.content-api` | `find`, `findOne` (media URLs; no upload for anonymous) |
| `plugin::users-permissions.auth.*` | Standard auth callbacks (register, reset password, etc.) |

**Not granted to Public:** admin API, content mutation, upload `upload` action (that is on **Authenticated** only).

## Authenticated role

The synced [`user-role.authenticated.json`](../config/sync/user-role.authenticated.json) grants the same core `find` / `findOne` actions on articles, podcasts, authors, categories, feeds, legal singles, and upload read as above, plus:

- `plugin::upload.content-api.upload`
- `plugin::users-permissions.auth.changePassword`, `logout`, `user.me`

It does **not** include every Public permission in the current export (for example, `api::about-feed.about-feed` and `api::search-index.search-index` appear only on Public). If logged-in users must call those endpoints directly, add the corresponding actions in Strapi and re-export sync.

## Server-to-server token (Next.js → Strapi)

The frontend uses **`STRAPI_API_TOKEN`** (see [`frontend/.env.local.example`](../../frontend/.env.local.example)) for authenticated fetches from Next.js server code. Treat it as a secret:

- Store only in deployment secrets / `.env.local` (never commit).
- Prefer a **read-only** API token in Strapi with the minimum scopes needed for build/runtime fetches, if Strapi’s token model allows scoping in your version.

## Operational checklist (periodic)

1. Confirm `user-role.public.json` still has no mutation permissions after permission changes.
2. Rotate `STRAPI_API_TOKEN` if leaked or on staff offboarding.
3. Keep Strapi and dependencies updated (security patches for REST query handling).
