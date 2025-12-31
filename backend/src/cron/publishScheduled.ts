/**
 * Cronjob to automatically publish scheduled articles and podcasts.
 * Runs every 15 minutes to publish drafts whose scheduled time (base.date) has arrived.
 */

/**
 * Publishes scheduled articles and podcasts whose scheduled time has arrived.
 *
 * Queries drafts (status: 'draft') that have never been published (publishedAt: null)
 * with base.date in the past, then publishes each entry. This ensures manually
 * unpublished content is not automatically republished.
 * Processes up to 50 articles and 50 podcasts per execution. Logs successful publications
 * and continues processing even if individual publish operations fail.
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

        // Process articles
        try {
            const articles = await strapi.documents('api::article.article').findMany({
                status: 'draft',
                filters: {
                    $and: [
                        {
                            publishedAt: {
                                $null: true,
                            },
                        },
                        {
                            base: {
                                date: {
                                    $lte: now,
                                },
                            },
                        },
                    ],
                },
                pagination: {
                    page: 1,
                    pageSize: 50, // Process up to 50 items per hour
                },
                fields: ['slug'],
            });

            if (articles && articles.length > 0) {
                strapi.log.info(`Found ${articles.length} scheduled articles to publish`);

                for (const article of articles) {
                    try {
                        const documentId = article.documentId || article.id;
                        await strapi.documents('api::article.article').publish({
                            documentId: documentId,
                        });

                        totalSuccessful++;
                        const identifier = article.slug || documentId;
                        strapi.log.info(`Published article: ${identifier}`);
                    } catch (error) {
                        totalFailed++;
                        const identifier = article.slug || article.documentId || article.id;
                        strapi.log.error(`Error publishing article ${identifier}:`, error);
                    }
                }

                totalProcessed += articles.length;
            }
        } catch (error) {
            strapi.log.error('Error querying articles for scheduled publishing:', error);
        }

        // Process podcasts
        try {
            const podcasts = await strapi.documents('api::podcast.podcast').findMany({
                status: 'draft',
                filters: {
                    $and: [
                        {
                            publishedAt: {
                                $null: true,
                            },
                        },
                        {
                            base: {
                                date: {
                                    $lte: now,
                                },
                            },
                        },
                    ],
                },
                pagination: {
                    page: 1,
                    pageSize: 50, // Process up to 50 items per hour
                },
                fields: ['slug'],
            });

            if (podcasts && podcasts.length > 0) {
                strapi.log.info(`Found ${podcasts.length} scheduled podcasts to publish`);

                for (const podcast of podcasts) {
                    try {
                        const documentId = podcast.documentId || podcast.id;
                        await strapi.documents('api::podcast.podcast').publish({
                            documentId: documentId,
                        });

                        totalSuccessful++;
                        const identifier = podcast.slug || documentId;
                        strapi.log.info(`Published podcast: ${identifier}`);
                    } catch (error) {
                        totalFailed++;
                        const identifier = podcast.slug || podcast.documentId || podcast.id;
                        strapi.log.error(`Error publishing podcast ${identifier}:`, error);
                    }
                }

                totalProcessed += podcasts.length;
            }
        } catch (error) {
            strapi.log.error('Error querying podcasts for scheduled publishing:', error);
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

