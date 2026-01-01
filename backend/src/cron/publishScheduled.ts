/**
 * Cronjob to automatically publish scheduled articles and podcasts.
 * Runs every 15 minutes to publish drafts whose scheduled time (base.date) has arrived.
 */

type ContentTypeConfig = {
    uid: string;
    contentTypeName: string;
};

const CONTENT_TYPES: ContentTypeConfig[] = [
    {uid: 'api::article.article', contentTypeName: 'article'},
    {uid: 'api::podcast.podcast', contentTypeName: 'podcast'},
];

/*
NOTE THIS DOES NOT WORK

https://github.com/strapi/strapi/issues/22721

WE CANNOT QUERY DRAFT ONLY DOCUMENTS ...
 */

/**
 * Publishes scheduled content of a specific type.
 *
 * @param strapi - The Strapi application instance
 * @param config - Content type configuration
 * @param now - Current date/time for filtering scheduled items
 * @returns Object with counts of processed, successful, and failed publications
 */
async function publishScheduledContentType(
    strapi: any,
    config: ContentTypeConfig,
    now: Date,
): Promise<{processed: number; successful: number; failed: number}> {
    let processed = 0;
    let successful = 0;
    let failed = 0;

    try {
        // Query drafts that have never been published
        // Note: We filter by base.date in-memory since Document Service API
        // may not support nested component field filtering reliably
        const items = await strapi.documents(config.uid).findMany({
            status: 'draft',
            filters: {
                publishedAt: {
                    $null: true,
                },
            },
            pagination: {
                page: 1,
                pageSize: 50, // Process up to 50 items per hour
            },
            populate: {
                base: {
                    fields: ['date'],
                },
            },
            fields: ['slug'],
        });

        if (!items || items.length === 0) {
            return {processed: 0, successful: 0, failed: 0};
        }

        // Filter by base.date in-memory since nested component filtering may not work
        const scheduledItems = items.filter((item: any) => {
            const baseDate = item.base?.date;
            if (!baseDate) {
                return false;
            }
            const itemDate = new Date(baseDate);
            return itemDate <= now;
        });

        if (scheduledItems.length === 0) {
            return {processed: 0, successful: 0, failed: 0};
        }

        strapi.log.info(
            `Found ${scheduledItems.length} scheduled ${config.contentTypeName}s to publish (out of ${items.length} drafts)`,
        );

        for (const item of scheduledItems) {
            try {
                const documentId = item.documentId || item.id;
                await strapi.documents(config.uid).publish({
                    documentId: documentId,
                });

                successful++;
                const identifier = item.slug || documentId;
                strapi.log.info(`Published ${config.contentTypeName}: ${identifier}`);
            } catch (error) {
                failed++;
                const identifier = item.slug || item.documentId || item.id;
                strapi.log.error(`Error publishing ${config.contentTypeName} ${identifier}:`, error);
            }
        }

        processed = scheduledItems.length;
    } catch (error) {
        strapi.log.error(`Error querying ${config.contentTypeName}s for scheduled publishing:`, error);
    }

    return {processed, successful, failed};
}

/**
 * Publishes scheduled articles and podcasts whose scheduled time has arrived.
 *
 * Queries drafts (status: 'draft') that have never been published (publishedAt: null)
 * with base.date in the past, then publishes each entry. This ensures manually
 * unpublished content is not automatically republished.
 * Processes up to 50 articles and 50 podcasts per execution. Logs successful publications
 * and continues processing even if individual publish operations fail.
 *
 * Note: Cache invalidation is handled by the middleware for each publish operation.
 * Multiple invalidations may occur, but the rate limit (30/min) should be sufficient
 * for typical batch sizes.
 *
 * @param strapi - The Strapi application instance used to query and publish documents
 */
export async function publishScheduledContent({strapi}: {strapi: any}): Promise<void> {
    try {
        strapi.log.info('Starting scheduled content publishing...');

        let totalProcessed = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;

        const now = new Date();

        // Process each content type
        for (const config of CONTENT_TYPES) {
            const result = await publishScheduledContentType(strapi, config, now);
            totalProcessed += result.processed;
            totalSuccessful += result.successful;
            totalFailed += result.failed;
        }

        if (totalProcessed === 0) {
            strapi.log.debug('No scheduled articles or podcasts found to publish');
        } else {
            strapi.log.info(
                `Scheduled publishing completed: ${totalProcessed} processed, ${totalSuccessful} successful, ${totalFailed} failed`,
            );
        }
    } catch (error) {
        strapi.log.error('Error in scheduled publishing cron job:', error);
    }
}
