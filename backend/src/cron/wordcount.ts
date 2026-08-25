/**
 * Cronjob to backfill wordCount for articles and podcasts missing it.
 *
 * Published entries are patched in place on the published row (query engine)
 * so `publishedAt` / History stay untouched. Never-published drafts are
 * updated via Document Service; those whose root `date` is due are then
 * published (same helper as the scheduled-publish cron).
 */

import {countWords, extractTextFromRichtext} from '../middlewares/wordCount';
import {documentServicePage} from '../utils/documentServicePage';
import type {ContentDocument, StrapiInstance} from '../types/middleware';
import {
    type ContentUid,
    publishDraftIfScheduledDateReached,
} from './scheduledPublish';

export const WORDCOUNT_BATCH_SIZE = 50;

// Only target `$null` values. `0` is a legitimate word count (empty or image-only
// richtext); including `$eq: 0` made those documents match every night, causing
// endless update() + publish() churn (cache busting and search-index rebuilds).
const WORDCOUNT_MISSING_FILTER = {
    wordCount: {
        $null: true,
    },
};

type RichtextField = 'content' | 'shownotes';

/**
 * Resolve a stable document id, throwing inside the per-document try block when
 * neither identifier exists (same failure accounting as any other per-doc error).
 */
function requireDocumentId(doc: ContentDocument): string | number {
    const id = doc.documentId ?? doc.id;
    if (id === undefined || id === null) {
        throw new Error(`Document "${doc.slug ?? '(unknown)'}" has neither documentId nor id`);
    }
    return id;
}

/**
 * Writes `wordCount` onto the published row only. Leaves `publishedAt` alone
 * (and keeps `updatedAt` if we have it) so a metadata backfill cannot look like
 * a republish. Does not touch the draft, so pending editorial edits stay unpublished.
 *
 * Uses the Query Engine rather than Document Service: `documents().update()`
 * always writes the draft, and `update({status: 'published'})` internally calls
 * `publish()`, which is what caused #688.
 */
async function patchPublishedWordCount({
    strapi,
    uid,
    documentId,
    wordCount,
    updatedAt,
}: {
    strapi: StrapiInstance;
    uid: ContentUid;
    documentId: string | number;
    wordCount: number;
    updatedAt?: string | null;
}): Promise<void> {
    const data: Record<string, unknown> = {wordCount};
    if (typeof updatedAt === 'string' && updatedAt.length > 0) {
        data.updatedAt = updatedAt;
    }

    await strapi.db.query(uid).updateMany({
        where: {
            documentId,
            publishedAt: {$ne: null},
        },
        data,
    });
}

async function backfillWordCountsForUid({
    strapi,
    uid,
    label,
    richtextField,
    status,
    publishAfterIfDue,
}: {
    strapi: StrapiInstance;
    uid: ContentUid;
    label: string;
    richtextField: RichtextField;
    status: 'published' | 'draft';
    publishAfterIfDue: boolean;
}): Promise<{processed: number; successful: number; failed: number; published: number}> {
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let published = 0;

    try {
        const fields: string[] = publishAfterIfDue
            ? ['slug', richtextField, 'date']
            : ['slug', richtextField, 'updatedAt'];

        const findParams: Record<string, unknown> = {
            filters: WORDCOUNT_MISSING_FILTER,
            ...documentServicePage(1, WORDCOUNT_BATCH_SIZE),
            fields,
            status,
        };

        if (status === 'draft') {
            findParams.hasPublishedVersion = false;
        }

        const docs = await strapi.documents(uid).findMany(findParams);

        if (!docs || docs.length === 0) {
            return {processed, successful, failed, published};
        }

        strapi.log.info(
            `WordCount backfill: found ${docs.length} ${label}(s) (${status}) missing wordCount`,
        );

        for (const doc of docs) {
            try {
                const richtextValue = doc[richtextField];
                const content = extractTextFromRichtext(richtextValue);
                const wordCount = countWords(content);

                const documentId = requireDocumentId(doc);

                if (status === 'published') {
                    await patchPublishedWordCount({
                        strapi,
                        uid,
                        documentId,
                        wordCount,
                        updatedAt: doc.updatedAt,
                    });
                } else {
                    // Default `update()` writes the draft. Never-published drafts only —
                    // `hasPublishedVersion: false` above — so this cannot push live edits.
                    await strapi.documents(uid).update({
                        documentId,
                        data: {
                            wordCount: wordCount,
                        },
                    });
                }

                successful++;
                strapi.log.debug(`Updated wordCount for ${label}: ${doc.slug} (${wordCount} words)`);

                if (publishAfterIfDue && status === 'draft') {
                    const didPublish = await publishDraftIfScheduledDateReached({
                        strapi,
                        uid,
                        documentId,
                        date: doc.date,
                        slug: doc.slug,
                        label,
                    });
                    if (didPublish) {
                        published++;
                    }
                }
            } catch (error) {
                failed++;
                strapi.log.error(`Error processing ${label} ${doc.documentId || doc.id}:`, error);
            }

            processed++;
        }
    } catch (error) {
        strapi.log.error(
            `WordCount backfill: error querying ${label}s (${status}):`,
            error,
        );
    }

    return {processed, successful, failed, published};
}

/**
 * Backfills missing wordCount fields for articles and podcasts by computing and updating them.
 *
 * Processes up to 50 published + 50 draft articles and the same for podcasts per invocation.
 * Published rows are patched in place (no `publish()`). Never-published drafts whose
 * `date` is due are published after wordCount is set.
 */
export async function generateMissingWordCounts({strapi}: {strapi: StrapiInstance}): Promise<void> {
    try {
        strapi.log.info('Starting wordCount backfill for articles and podcasts...');

        let totalProcessed = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;
        let totalPublishedAfter = 0;

        const runs = [
            () =>
                backfillWordCountsForUid({
                    strapi,
                    uid: 'api::article.article',
                    label: 'article',
                    richtextField: 'content',
                    status: 'published',
                    publishAfterIfDue: false,
                }),
            () =>
                backfillWordCountsForUid({
                    strapi,
                    uid: 'api::article.article',
                    label: 'article',
                    richtextField: 'content',
                    status: 'draft',
                    publishAfterIfDue: true,
                }),
            () =>
                backfillWordCountsForUid({
                    strapi,
                    uid: 'api::podcast.podcast',
                    label: 'podcast',
                    richtextField: 'shownotes',
                    status: 'published',
                    publishAfterIfDue: false,
                }),
            () =>
                backfillWordCountsForUid({
                    strapi,
                    uid: 'api::podcast.podcast',
                    label: 'podcast',
                    richtextField: 'shownotes',
                    status: 'draft',
                    publishAfterIfDue: true,
                }),
        ];

        for (const run of runs) {
            const r = await run();
            totalProcessed += r.processed;
            totalSuccessful += r.successful;
            totalFailed += r.failed;
            totalPublishedAfter += r.published;
        }

        if (totalProcessed === 0) {
            strapi.log.debug('No articles or podcasts missing wordCount found');
        } else {
            strapi.log.info(
                `WordCount backfill completed: ${totalProcessed} processed, ${totalSuccessful} successful, ${totalFailed} failed` +
                    (totalPublishedAfter > 0
                        ? `, ${totalPublishedAfter} never-published draft(s) published after backfill`
                        : ''),
            );
        }
    } catch (error) {
        strapi.log.error('Error in wordCount cron job:', error);
    }
}
