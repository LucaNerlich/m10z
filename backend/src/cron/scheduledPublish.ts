/**
 * Cron job to auto-publish scheduled articles and podcasts.
 * https://github.com/strapi/strapi/pull/25292
 *
 * Finds draft documents whose root `date` is in the past (or within a small
 * leeway window) and that have never been published, then publishes them.
 * Runs every 15 minutes. Cache invalidation is handled automatically by the
 * existing cacheInvalidationMiddleware in the document service pipeline.
 */

/** Same leeway as scheduled publish: treat dates up to this far in the future as "due". */
export const SCHEDULE_PUBLISH_LEEWAY_MS = 2 * 60 * 1000; // 2 minutes into the future

const PAGE_SIZE = 25;

export type ContentUid = 'api::article.article' | 'api::podcast.podcast';

/**
 * ISO timestamp used as the upper bound for "scheduled date has arrived" (aligned with scheduled publish cron).
 */
export function getSchedulePublishCutoffIso(): string {
    return new Date(Date.now() + SCHEDULE_PUBLISH_LEEWAY_MS).toISOString();
}

/**
 * Publishes a draft document when its root `date` is at or before the schedule cutoff.
 * Used by the scheduled-publish cron and by the wordCount backfill after fixing drafts.
 *
 * @returns `true` if publish was attempted and succeeded
 */
export async function publishDraftIfScheduledDateReached({
    strapi,
    uid,
    documentId,
    date,
    slug,
    label,
}: {
    strapi: any;
    uid: ContentUid;
    documentId: string | number;
    date: string | null | undefined;
    slug: string;
    label: string;
}): Promise<boolean> {
    const cutoffIso = getSchedulePublishCutoffIso();
    if (!date) {
        return false;
    }
    if (new Date(date) > new Date(cutoffIso)) {
        return false;
    }
    try {
        await strapi.documents(uid).publish({documentId});
        strapi.log.info(
            `publishDraftIfScheduledDateReached: published ${label} "${slug}" (${documentId}) — date <= ${cutoffIso}`,
        );
        return true;
    } catch (error) {
        strapi.log.error(
            `publishDraftIfScheduledDateReached: failed ${label} "${slug}" (${documentId}):`,
            error,
        );
        return false;
    }
}

const CONTENT_TYPES: {uid: ContentUid; label: string}[] = [
    {uid: 'api::article.article', label: 'article'},
    {uid: 'api::podcast.podcast', label: 'podcast'},
];

/**
 * Publishes draft articles and podcasts whose scheduled date has arrived.
 *
 * @param strapi - The Strapi instance injected by the cron runner
 */
export async function publishScheduledEntries({strapi}: {strapi: any}): Promise<void> {
    try {
        const cutoffDate = getSchedulePublishCutoffIso();

        strapi.log.info(`Scheduled publish: checking for entries with date <= ${cutoffDate}`);

        let totalPublished = 0;
        let totalFailed = 0;

        for (const {uid, label} of CONTENT_TYPES) {
            try {
                let page = 1;
                let pageDocuments: any[];

                do {
                    pageDocuments = await strapi.documents(uid).findMany({
                        status: 'draft',
                        hasPublishedVersion: false,
                        filters: {
                            date: {
                                $notNull: true,
                                $lte: cutoffDate,
                            },
                        },
                        fields: ['slug'],
                        pagination: {
                            page,
                            pageSize: PAGE_SIZE,
                        },
                    });

                    if (!pageDocuments || pageDocuments.length === 0) {
                        if (page === 1) {
                            strapi.log.debug(`Scheduled publish: no ${label}s to publish`);
                        }
                        break;
                    }

                    strapi.log.info(
                        `Scheduled publish: found ${pageDocuments.length} ${label}(s) on page ${page}`,
                    );

                    const results = await Promise.allSettled(
                        pageDocuments.map((doc) =>
                            strapi
                                .documents(uid)
                                .publish({documentId: doc.documentId})
                                .then(() => ({doc, error: null}))
                                .catch((error: unknown) => {
                                    throw {doc, error};
                                }),
                        ),
                    );

                    for (const result of results) {
                        if (result.status === 'fulfilled') {
                            const {doc} = result.value;
                            totalPublished++;
                            strapi.log.info(
                                `Scheduled publish: published ${label} "${doc.slug}" (${doc.documentId})`,
                            );
                        } else {
                            const {doc, error} = result.reason;
                            totalFailed++;
                            strapi.log.error(
                                `Scheduled publish: failed to publish ${label} "${doc.slug}" (${doc.documentId}):`,
                                error,
                            );
                        }
                    }

                    page++;
                } while (pageDocuments.length >= PAGE_SIZE);
            } catch (error) {
                strapi.log.error(`Scheduled publish: error querying ${label}s:`, error);
            }
        }

        if (totalPublished === 0 && totalFailed === 0) {
            strapi.log.debug('Scheduled publish: nothing to publish');
        } else {
            strapi.log.info(
                `Scheduled publish: done — ${totalPublished} published, ${totalFailed} failed`,
            );
        }
    } catch (error) {
        strapi.log.error('Scheduled publish: unexpected error:', error);
    }
}
