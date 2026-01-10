---
name: Scheduled Publishing Cron Job
overview: "Create an hourly cron job that automatically publishes articles and podcasts whose scheduled time (`base.date`) has arrived. The job queries drafts (`status: 'draft'`) with past scheduled dates and publishes them using Strapi's Document Service API."
todos:
  - id: create-cron-file
    content: Create backend/src/cron/publishScheduled.ts with function to query and publish scheduled articles and podcasts
    status: pending
  - id: register-cron-job
    content: Register the cron job in backend/config/server.ts with hourly execution pattern
    status: pending
    dependencies:
      - create-cron-file
---

# Scheduled Publishing Cron Job

## Overview

Implement an hourly cron job that finds and publishes scheduled articles and podcasts. The job queries drafts with `status: 'draft'` where `base.date` is in the past, then publishes each entry.

## Implementation

### 1. Create Cron Job File

**File: `backend/src/cron/publishScheduled.ts`**Create a new cron job following the pattern from `backend/src/cron/blurhash.ts` and `backend/src/cron/wordcount.ts`:

- Export async function `publishScheduledContent({strapi}: {strapi: any}): Promise<void>`
- Query articles using `strapi.documents('api::article.article').findMany()` with:
- Filters combining `publishedAt: { $null: true }` (draft status) and `base: { date: { $lte: new Date() } }` (past scheduled time)
- Pagination: `{ page: 1, pageSize: 50 }`
- Query podcasts using `strapi.documents('api::podcast.podcast').findMany()` with same filter pattern
- For each entry, call `strapi.documents(uid).publish({ documentId: entry.documentId || entry.id })`
- Wrap each publish operation in try-catch to log failures without stopping the job
- Log successful publications with document identifier (slug or documentId)
- Track and log summary statistics (total found, successful, failed)

**Note:** The filter syntax `base: { date: { $lte: new Date() } }` assumes Strapi Document Service API supports nested component field filtering. If this doesn't work, we may need to query all drafts and filter in-memory, or use a different filter approach.

### 2. Register Cron Job

**File: `backend/config/server.ts`**

- Import the new function: `import {publishScheduledContent} from '../src/cron/publishScheduled';`
- Add to `cron.tasks` object:
  ```typescript
            publishScheduledContent: {
                task: publishScheduledContent,
                options: {
                    rule: '0 * * * *', // Run every hour at minute 0
                },
            },
  ```




## Files to Modify

- `backend/src/cron/publishScheduled.ts` (new file)
- `backend/config/server.ts` (add import and task registration)

## Error Handling

- Each publish operation should be wrapped in try-catch
- Log individual failures with document identifier
- Continue processing remaining items even if one fails
- Log final summary with counts of successful and failed publications

## Logging