# Recovering after BaseContent was removed too early

**Note:** The production migration path (backfill, then remove `base`) is complete in the main codebase. This document
is for **disaster recovery** if someone deploys the flattened schema against a database that was never backfilled.

If Strapi was started with a schema that **no longer has `base`**, but you **never ran the copy** from `base` to root
fields while `base` still existed, the CMS can show empty titles, missing covers, etc. The plan always required **phase
A → backfill → phase C**, in that order.

## 1. Best recovery: database backup

Restore PostgreSQL from a snapshot taken **before** the first deploy that removed the `base` component (Coolify database
backups, or your own `pg_dump`).

After restore:

1. Run a build that still has **`base` on article/podcast/category** *and* root fields (phase A), **or** restore the
   repo to that commit.
2. Set **`MIGRATE_FLATTEN_BASE=true`**, start Strapi once, confirm logs: `[migrate-flatten-base] Done`.
3. Remove **`MIGRATE_FLATTEN_BASE`**, then deploy the version **without** `base` (phase C).

## 2. Check whether old data still exists (no backup yet)

Connect to the same database Strapi uses and list relevant tables (names vary; Strapi 5 may shorten prefixes, e.g.
`cmps_` / `lnk_`):

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%base%content%'
    OR table_name ILIKE 'cmps%'
    OR table_name ILIKE '%components%base%'
  )
ORDER BY table_name;
```

If you still see rows in a component table that held BaseContent, **do not** run arbitrary `DELETE` / schema tweaks;
prefer a restore or a Strapi-supervised path after talking to your team.

If tables are empty or missing, recovery is **backup-only**.

## 3. Wrong order (what went wrong)

| What happened                                                         | Result                                                                                 |
|-----------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| Phase C in code + start Strapi                                        | DB schema drops `base`; root fields stay empty if never backfilled → “data gone” in UI |
| Correct: phase A → `MIGRATE_FLATTEN_BASE=true` → remove env → phase C | Root fields populated; then safe to remove `base`                                      |

## 4. Local dev

Same rules: never check out / run the “flattened only” schema against a database that was never backfilled while `base`
existed. Use a restored DB or a fresh DB with new content.
