import {invalidateNext} from './utils/invalidateNextCache';
import {buildAndPersistSearchIndex} from './services/searchIndexBuilder';
import {parseFile} from 'music-metadata';
import {existsSync} from 'fs';
import {promises as fsPromises} from 'fs';
import {resolve} from 'path';
import {generateBlurDataUrl} from './utils/generateBlurhash';

/**
 * Generate blur data URL (base64 encoded PNG) for image file and set it in the data object.
 * This function handles file retrieval, path resolution, blur placeholder generation,
 * and error handling without blocking the save operation.
 * The generated data URL can be used directly with Next.js Image component's blurDataURL prop.
 */
async function generateBlurhashForFile(strapi: any, data: any): Promise<void> {
    try {
        // Get file URL from data (for upload plugin, URL is directly in data.url)
        let fileUrl: string | undefined = data.url;

        if (!fileUrl) {
            strapi.log.debug('No file URL found in upload data');
            return;
        }

        // Resolve file path securely
        // Handle both relative URLs (starting with /) and absolute URLs
        const publicDir = strapi.dirs?.public || strapi.dirs?.static?.public;
        if (!publicDir) {
            strapi.log.warn('Public directory not found in strapi.dirs');
            return;
        }

        // Remove leading slash if present to handle relative URLs
        const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
        const filePath = resolve(publicDir, relativePath);

        // Security: Validate path is within public directory to prevent path traversal
        const resolvedPublicDir = resolve(publicDir);
        if (!filePath.startsWith(resolvedPublicDir)) {
            strapi.log.warn(`File path outside public directory: ${filePath}`);
            return;
        }

        // Check if file exists
        if (!existsSync(filePath)) {
            strapi.log.warn(`Image file does not exist at path: ${filePath}`);
            return;
        }

        // Read file buffer
        const fileBuffer = await fsPromises.readFile(filePath);

        // Generate blur data URL (base64 encoded PNG for Next.js Image placeholder)
        const blurDataUrl = await generateBlurDataUrl(fileBuffer);

        if (blurDataUrl) {
            data.blurhash = blurDataUrl;
            strapi.log.debug(`Generated blur data URL for file: ${fileUrl}`);
        } else {
            strapi.log.warn(`Failed to generate blur data URL for file: ${fileUrl}`);
        }
    } catch (error) {
        // Log error but don't throw - allow save operation to proceed
        strapi.log.error('Error generating blurhash:', error);
    }
}

/**
 * Extract duration from podcast audio file and set it in the data object.
 * This function handles file retrieval, path resolution, metadata extraction,
 * and error handling without blocking the save operation.
 */
async function extractDuration(strapi: any, data: any): Promise<void> {
    try {
        // Check if file is already populated with URL (common in Strapi)
        let fileUrl: string | undefined;
        let fileRecord: any;

        if (data.file?.url) {
            // File object already contains URL
            fileUrl = data.file.url;
            fileRecord = data.file;
        } else {
            // Extract file identifier (can be ID, documentId, or object with id/documentId)
            let fileId: number | string | undefined;
            if (typeof data.file === 'number') {
                fileId = data.file;
            } else if (typeof data.file === 'string') {
                fileId = data.file;
            } else if (data.file?.id) {
                fileId = data.file.id;
            } else if (data.file?.documentId) {
                fileId = data.file.documentId;
            }

            if (!fileId) {
                strapi.log.debug('No file ID found in podcast data');
                return;
            }

            // Query upload file record
            fileRecord = await strapi.documents('plugin::upload.file').findOne({
                documentId: fileId,
            });

            if (!fileRecord) {
                strapi.log.warn(`Upload file record not found for ID: ${fileId}`);
                return;
            }

            // Extract file URL from record
            fileUrl = fileRecord.url;
        }

        if (!fileUrl) {
            strapi.log.warn('File URL not found in upload record');
            return;
        }

        // Resolve file path securely
        // Handle both relative URLs (starting with /) and absolute URLs
        const publicDir = strapi.dirs?.public || strapi.dirs?.static?.public;
        if (!publicDir) {
            strapi.log.warn('Public directory not found in strapi.dirs');
            return;
        }

        // Remove leading slash if present to handle relative URLs
        const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
        const filePath = resolve(publicDir, relativePath);

        // Security: Validate path is within public directory to prevent path traversal
        const resolvedPublicDir = resolve(publicDir);
        if (!filePath.startsWith(resolvedPublicDir)) {
            strapi.log.warn(`File path outside public directory: ${filePath}`);
            return;
        }

        // Check if file exists
        if (!existsSync(filePath)) {
            strapi.log.warn(`Audio file does not exist at path: ${filePath}`);
            return;
        }

        // Extract metadata using music-metadata
        const metadata = await parseFile(filePath);
        const duration = metadata.format?.duration;

        if (duration && typeof duration === 'number' && duration > 0) {
            // Convert to integer seconds and set in data
            data.duration = Math.round(duration);
            strapi.log.debug(`Extracted duration: ${data.duration} seconds for file: ${fileUrl}`);
        } else {
            strapi.log.warn(`Duration not found in metadata for file: ${fileUrl}`);
        }
    } catch (error) {
        // Log error but don't throw - allow save operation to proceed
        strapi.log.error('Error extracting audio duration:', error);
    }
}

export default {
    /**
     * Register middleware on the Document Service to invalidate
     * the Next.js frontend after successful mutations.
     */
    register({strapi}: {strapi: any}) {
        // Extend upload file schema with blurhash attribute (stores base64 data URL)
        if (strapi.plugin('upload')?.contentTypes?.file?.attributes) {
            strapi.plugin('upload').contentTypes.file.attributes.blurhash = {
                type: 'text', // Use text instead of string for longer base64 data URLs
            };
        }

        const publishTargets = new Map<string, 'articlefeed' | 'audiofeed'>([
            ['api::article.article', 'articlefeed'],
            ['api::podcast.podcast', 'audiofeed'],
        ]);

        const updateTargets = new Map<string, 'articlefeed' | 'audiofeed' | 'about'>([
            ['api::article-feed.article-feed', 'articlefeed'],
            ['api::audio-feed.audio-feed', 'audiofeed'],
            ['api::about.about', 'about'],
        ]);

        const searchTargets = new Set<string>([
            'api::article.article',
            'api::podcast.podcast',
            'api::author.author',
            'api::category.category',
        ]);

        const rebuildActions = new Set<string>(['publish', 'update', 'delete', 'unpublish']);

        // Middleware to generate blurhash for image uploads
        strapi.documents.use(async (context: {
            uid: string;
            action: string;
            params?: any
        }, next: () => Promise<unknown>) => {
            // Only process upload file content type for create/update actions
            if (context.uid === 'plugin::upload.file' && ['create', 'update'].includes(context.action)) {
                try {
                    const data = context.params?.data;
                    // Check if file is an image
                    if (data?.mime && data.mime.startsWith('image/')) {
                        await generateBlurhashForFile(strapi, data);
                        // Note: blurhash is set in data.blurhash, but since it's not in schema,
                        // we'll update it via raw query after save
                    }
                } catch (error) {
                    // Log error but don't block the operation
                    strapi.log.warn('Failed to generate blurhash:', error);
                }
            }
            return next();
        });

        // Middleware to extract audio duration for podcasts
        strapi.documents.use(async (context: {
            uid: string;
            action: string;
            params?: any
        }, next: () => Promise<unknown>) => {
            // Only process podcast content type for create/update actions
            if (context.uid === 'api::podcast.podcast' && ['create', 'update'].includes(context.action)) {
                try {
                    const data = context.params?.data;
                    if (data?.file) {
                        await extractDuration(strapi, data);
                    }
                } catch (error) {
                    // Log error but don't block the operation
                    strapi.log.warn('Failed to extract podcast duration:', error);
                }
            }
            return next();
        });

        strapi.documents.use(async (context: {uid: string; action: string}, next: () => Promise<unknown>) => {
            // Run the core operation first; only invalidate on success.
            const result = await next();

            //Invalidate Content
            if (context.action === 'publish' && publishTargets.has(context.uid)) {
                await invalidateNext(publishTargets.get(context.uid)!);
            } else if (context.action === 'update' && updateTargets.has(context.uid)) {
                await invalidateNext(updateTargets.get(context.uid)!);
            }

            // Rebuild search index
            if (rebuildActions.has(context.action) && searchTargets.has(context.uid)) {
                try {
                    await buildAndPersistSearchIndex(strapi);
                    await invalidateNext('search-index');

                    // Invalidate Sitemap
                    await invalidateNext('sitemap');
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.warn('Failed to rebuild search index', err);
                }
            }

            return result;
        });
    },

    /**
     * An asynchronous bootstrap function that runs before
     * your application gets started.
     *
     * This gives you an opportunity to set up your data model,
     * run jobs, or perform some special logic.
     */
    async bootstrap({strapi}: {strapi: any}) {
        // Add blurhash column to files table if it doesn't exist
        // This ensures the database column exists even if schema extension happens after DB init
        try {
            const db = strapi.db;
            const tableName = 'files';
            const columnName = 'blurhash';

            // Check if column exists by querying the information schema
            // Use parameterized query to avoid SQL injection
            const columnCheck = await db.connection.raw(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = ? 
                AND column_name = ?
                AND table_schema = current_schema()
            `, [tableName, columnName]);

            const columnExists = columnCheck.rows && columnCheck.rows.length > 0;

            if (!columnExists) {
                // Add the blurhash column
                await db.connection.raw(`
                    ALTER TABLE ?? 
                    ADD COLUMN ?? TEXT
                `, [tableName, columnName]);
                strapi.log.info('Added blurhash column to files table');
            } else {
                strapi.log.debug('Blurhash column already exists in files table');
            }
        } catch (err) {
            // Log error but don't fail bootstrap - column might already exist or DB might not be ready
            strapi.log.warn('Failed to add blurhash column (may already exist):', err);
        }

        try {
            await buildAndPersistSearchIndex(strapi);
            // eslint-disable-next-line no-console
            console.log('Search index bootstrap completed');
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Search index bootstrap failed (will rebuild on next publish)', err);
        }

        // Backfill blurhashes for existing images
        try {
            const skipBackfill = process.env.SKIP_BLURHASH_BACKFILL === 'true';
            if (skipBackfill) {
                strapi.log.info('Skipping blurhash backfill (SKIP_BLURHASH_BACKFILL=true)');
                return;
            }

            const pageSize = 10;
            let page = 0;
            let totalProcessed = 0;
            let totalSuccessful = 0;
            let totalFailed = 0;

            strapi.log.info('Starting blurhash backfill for existing images...');

            while (true) {
                // Query images missing blurhash
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
                        page: page + 1,
                        pageSize,
                    },
                });

                if (!files || files.length === 0) {
                    break;
                }

                const totalInBatch = files.length;
                strapi.log.info(
                    `Processing batch ${page + 1}: ${totalInBatch} images (total processed: ${totalProcessed})`,
                );

                // Process each image in the batch
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    totalProcessed++;

                    try {
                        // Get file URL
                        const fileUrl = file.url;
                        if (!fileUrl) {
                            strapi.log.warn(`File ${file.documentId || file.id} has no URL, skipping`);
                            totalFailed++;
                            continue;
                        }

                        // Resolve file path securely
                        const publicDir = strapi.dirs?.public || strapi.dirs?.static?.public;
                        if (!publicDir) {
                            strapi.log.warn('Public directory not found in strapi.dirs');
                            totalFailed++;
                            continue;
                        }

                        // Remove leading slash if present to handle relative URLs
                        const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
                        const filePath = resolve(publicDir, relativePath);

                        // Security: Validate path is within public directory to prevent path traversal
                        const resolvedPublicDir = resolve(publicDir);
                        if (!filePath.startsWith(resolvedPublicDir)) {
                            strapi.log.warn(
                                `File path outside public directory: ${filePath} (file ID: ${file.documentId || file.id})`,
                            );
                            totalFailed++;
                            continue;
                        }

                        // Check if file exists
                        if (!existsSync(filePath)) {
                            strapi.log.warn(
                                `Image file does not exist at path: ${filePath} (file ID: ${file.documentId || file.id})`,
                            );
                            totalFailed++;
                            continue;
                        }

                        // Read file buffer
                        const fileBuffer = await fsPromises.readFile(filePath);

                        // Generate blur data URL (base64 encoded PNG for Next.js Image placeholder)
                        const blurDataUrl = await generateBlurDataUrl(fileBuffer);

                        if (blurDataUrl) {
                            // Update record - blurhash is now in schema via register() extension
                            await strapi.documents('plugin::upload.file').update({
                                documentId: file.documentId || file.id,
                                data: {
                                    blurhash: blurDataUrl,
                                },
                            });

                            totalSuccessful++;
                            strapi.log.debug(
                                `Generated blur data URL for image ${totalProcessed}: ${fileUrl}`,
                            );
                        } else {
                            strapi.log.warn(
                                `Failed to generate blur data URL for image ${totalProcessed}: ${fileUrl}`,
                            );
                            totalFailed++;
                        }
                    } catch (error) {
                        strapi.log.error(
                            `Error processing image ${totalProcessed} (ID: ${file.documentId || file.id}):`,
                            error,
                        );
                        totalFailed++;
                    }
                }

                // If we got fewer results than pageSize, we're done
                if (files.length < pageSize) {
                    break;
                }

                page++;
            }

            strapi.log.info(
                `Blurhash backfill completed: ${totalSuccessful} successful, ${totalFailed} failed, ${totalProcessed} total processed`,
            );
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Blurhash backfill failed:', err);
        }
    },
};
