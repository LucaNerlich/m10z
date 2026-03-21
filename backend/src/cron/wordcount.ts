/**
 * Cronjob to backfill wordCount for articles and podcasts missing it.
 *
 * Processes published entries and drafts that have never been published (`hasPublishedVersion: false`).
 * For published entries: `update()` then `publish({ documentId})` so the live version picks up wordCount.
 * For never-published drafts: after `update()`, `publish()` when root `date` is due (same as scheduled publish).
 */

import {countWords, extractTextFromRichtext} from '../middlewares/wordCount';
import {
    type ContentUid,
    publishDraftIfScheduledDateReached,
} from './scheduledPublish';

const WORDCOUNT_MISSING_FILTER = {
    $or: [
        {
            wordCount: {
                $null: true,
            },
        },
        {
            wordCount: {
                $eq: 0,
            },
        },
    ],
};

type RichtextField = 'content' | 'shownotes';

async function backfillWordCountsForUid({
    strapi,
    uid,
    label,
    richtextField,
    status,
    publishAfterIfDue,
}: {
    strapi: any;
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
            : ['slug', richtextField];

        const findParams: Record<string, unknown> = {
            filters: WORDCOUNT_MISSING_FILTER,
            pagination: {
                page: 1,
                pageSize: 50,
            },
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

                const documentId = doc.documentId || doc.id;

                // Default `update()` writes the draft. For entries we read as `published`, call
                // `publish()` afterward so the live version matches (same pattern as scheduled publish).
                await strapi.documents(uid).update({
                    documentId,
                    data: {
                        wordCount: wordCount,
                    },
                });

                if (status === 'published') {
                    await strapi.documents(uid).publish({documentId});
                    published++;
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
 * Drafts with `date` in the past are published after wordCount is set (never-published drafts only).
 */
export async function generateMissingWordCounts({strapi}: {strapi: any}): Promise<void> {
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
                    (totalPublishedAfter > 0 ? `, ${totalPublishedAfter} publish() after backfill` : ''),
            );
        }
    } catch (error) {
        strapi.log.error('Error in wordCount cron job:', error);
    }
}
