import {invalidateNext} from './utils/invalidateNextCache';
import {buildAndPersistSearchIndex} from './services/searchIndexBuilder';
import {parseFile} from 'music-metadata';
import {existsSync} from 'fs';
import {resolve} from 'path';

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
        try {
            await buildAndPersistSearchIndex(strapi);
            // eslint-disable-next-line no-console
            console.log('Search index bootstrap completed');
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Search index bootstrap failed (will rebuild on next publish)', err);
        }
    },
};
