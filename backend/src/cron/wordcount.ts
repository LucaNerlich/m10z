/**
 * Cronjob to backfill wordCount for articles and podcasts missing it.
 * Runs hourly to process up to 50 items per execution.
 */

import {countWords, extractTextFromRichtext} from '../middlewares/wordCount';

/**
 * Backfills missing wordCount fields for articles and podcasts by computing and updating them.
 *
 * Processes up to 50 articles and 50 podcasts per invocation; updates each document's `wordCount`
 * when it is null or equal to zero and logs a summary of processed, successful, and failed updates.
 */
export async function generateMissingWordCounts({strapi}: {strapi: any}): Promise<void> {
    try {
        strapi.log.info('Starting hourly wordCount backfill for missing articles and podcasts...');

        let totalProcessed = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;

        // Process articles
        try {
            const articles = await strapi.documents('api::article.article').findMany({
                filters: {
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
                },
                pagination: {
                    page: 1,
                    pageSize: 50, // Process up to 50 items per hour
                },
                fields: ['slug', 'content'],
            });

            if (articles && articles.length > 0) {
                strapi.log.info(`Found ${articles.length} articles missing wordCount`);

                for (const article of articles) {
                    try {
                        const richtextValue = article.content;
                        const content = extractTextFromRichtext(richtextValue);
                        const wordCount = countWords(content);
                        await strapi.documents('api::article.article').update({
                            documentId: article.documentId || article.id,
                            data: {
                                wordCount: wordCount,
                            },
                        });

                        totalSuccessful++;
                        strapi.log.debug(`Updated wordCount for article: ${article.slug} (${wordCount} words)`);
                    } catch (error) {
                        totalFailed++;
                        strapi.log.error(
                            `Error processing article ${article.documentId || article.id}:`,
                            error,
                        );
                    }
                }

                totalProcessed += articles.length;
            }
        } catch (error) {
            strapi.log.error('Error querying articles for wordCount backfill:', error);
        }

        // Process podcasts
        try {
            const podcasts = await strapi.documents('api::podcast.podcast').findMany({
                filters: {
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
                },
                pagination: {
                    page: 1,
                    pageSize: 50, // Process up to 50 items per hour
                },
                fields: ['slug', 'shownotes'],
            });

            if (podcasts && podcasts.length > 0) {
                strapi.log.info(`Found ${podcasts.length} podcasts missing wordCount`);

                for (const podcast of podcasts) {
                    try {
                        const richtextValue = podcast.shownotes;
                        const content = extractTextFromRichtext(richtextValue);
                        const wordCount = countWords(content);

                        await strapi.documents('api::podcast.podcast').update({
                            documentId: podcast.documentId || podcast.id,
                            data: {
                                wordCount: wordCount,
                            },
                        });

                        totalSuccessful++;
                        strapi.log.debug(`Updated wordCount for podcast: ${podcast.slug} (${wordCount} words)`);
                    } catch (error) {
                        totalFailed++;
                        strapi.log.error(
                            `Error processing podcast ${podcast.documentId || podcast.id}:`,
                            error,
                        );
                    }
                }

                totalProcessed += podcasts.length;
            }
        } catch (error) {
            strapi.log.error('Error querying podcasts for wordCount backfill:', error);
        }

        if (totalProcessed === 0) {
            strapi.log.debug('No articles or podcasts missing wordCount found');
        } else {
            strapi.log.info(
                `WordCount backfill completed: ${totalProcessed} processed, ${totalSuccessful} successful, ${totalFailed} failed`,
            );
        }
    } catch (error) {
        strapi.log.error('Error in wordCount cron job:', error);
    }
}
