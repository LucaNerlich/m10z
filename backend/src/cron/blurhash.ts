/**
 * Cronjob to generate blurhash for images missing it.
 * Runs hourly to process up to 50 images per execution.
 */

import {generateBlurDataUrl} from '../utils/generateBlurhash';
import {existsSync, promises as fsPromises} from 'fs';
import {resolve} from 'path';

/**
 * Scan uploaded image files and generate blurhash data URLs for those missing a blurhash.
 *
 * Processes up to 50 image files per run: validates file paths inside the public directory, reads image files, generates a blur data URL, and updates the corresponding upload file records with the generated blurhash. Logs per-file outcomes and a final summary of successful and failed updates.
 *
 * @param strapi - The Strapi application instance used to query/update upload documents, access configured directories, and emit logs
 */
export async function generateMissingBlurhashes({strapi}: {strapi: any}): Promise<void> {
    try {
        strapi.log.info('Starting hourly blurhash generation for missing images...');

        // Find images without blurhash
        const files = await strapi.documents('plugin::upload.file').findMany({
            filters: {
                $and: [
                    {
                        mime: {
                            $startsWith: 'image/',
                        },
                    },
                    {
                        $or: [
                            {
                                blurhash: {
                                    $null: true,
                                },
                            },
                            {
                                blurhash: '',
                            },
                        ],
                    },
                ],
            },
            pagination: {
                page: 1,
                pageSize: 50, // Process up to 50 images per hour
            },
        });

        if (!files || files.length === 0) {
            strapi.log.debug('No images missing blurhash found');
            return;
        }

        strapi.log.info(`Found ${files.length} images missing blurhash`);

        let successful = 0;
        let failed = 0;

        for (const file of files) {
            try {
                const fileUrl = file.url;
                if (!fileUrl) {
                    strapi.log.warn(`File ${file.documentId || file.id} has no URL, skipping`);
                    failed++;
                    continue;
                }

                // Resolve file path securely
                const publicDir = strapi.dirs?.public || strapi.dirs?.static?.public;
                if (!publicDir) {
                    strapi.log.warn('Public directory not found');
                    failed++;
                    continue;
                }

                const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
                const filePath = resolve(publicDir, relativePath);

                // Security: Validate path is within public directory
                const resolvedPublicDir = resolve(publicDir);
                if (!filePath.startsWith(resolvedPublicDir)) {
                    strapi.log.warn(`File path outside public directory: ${filePath}`);
                    failed++;
                    continue;
                }

                if (!existsSync(filePath)) {
                    strapi.log.warn(`Image file does not exist: ${filePath}`);
                    failed++;
                    continue;
                }

                // Read file and generate blur data URL
                const fileBuffer = await fsPromises.readFile(filePath);
                const blurDataUrl = await generateBlurDataUrl(fileBuffer);

                if (blurDataUrl) {
                    await strapi.documents('plugin::upload.file').update({
                        documentId: file.documentId || file.id,
                        data: {
                            blurhash: blurDataUrl,
                        },
                    });
                    successful++;
                    strapi.log.debug(`Generated blurhash for: ${fileUrl}`);
                } else {
                    strapi.log.warn(`Failed to generate blurhash for: ${fileUrl}`);
                    failed++;
                }
            } catch (error) {
                strapi.log.error(`Error processing file ${file.documentId || file.id}:`, error);
                failed++;
            }
        }

        strapi.log.info(`Blurhash generation completed: ${successful} successful, ${failed} failed`);
    } catch (error) {
        strapi.log.error('Error in blurhash cron job:', error);
    }
}
