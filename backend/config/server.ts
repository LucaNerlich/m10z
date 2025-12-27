export default ({env}) => ({
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    app: {
        keys: env.array('APP_KEYS'),
    },
    cron: {
        enabled: true,
        tasks: {
            // Generate blurhash for images missing it - runs every hour
            generateMissingBlurhashes: {
                task: async ({strapi}) => {
                    try {
                        const {generateBlurDataUrl} = require('../src/utils/generateBlurhash');
                        const {existsSync} = require('fs');
                        const {promises: fsPromises} = require('fs');
                        const {resolve} = require('path');

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

                        strapi.log.info(
                            `Blurhash generation completed: ${successful} successful, ${failed} failed`,
                        );
                    } catch (error) {
                        strapi.log.error('Error in blurhash cron job:', error);
                    }
                },
                options: {
                    rule: '0 * * * *', // Run every hour at minute 0
                },
            },
        },
    },
});
