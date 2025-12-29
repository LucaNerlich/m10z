/**
 * Duration extraction middleware for podcasts.
 *
 * Extracts audio duration from podcast audio files and sets it in the data object.
 */

import {parseFile} from 'music-metadata';
import {existsSync} from 'fs';
import {resolve} from 'path';

/**
 * Extracts audio duration from the podcast file referenced by `data.file` and sets `data.duration` to the rounded number of seconds.
 *
 * Attempts to locate the file URL from `data.file` (object with `url`, numeric/string id, `id`, or `documentId`), resolves the path inside Strapi's public directory, reads audio metadata, and updates `data.duration` when a positive duration is found. Errors are logged and do not interrupt the save operation.
 *
 * @param data - The entity data being saved; if a file is present its duration will be assigned to `data.duration` as an integer number of seconds
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

/**
 * Runs on podcast create/update to extract audio duration and attach it to the entity data before saving.
 *
 * When the context targets `api::podcast.podcast` and the action is `create` or `update`, this middleware
 * attempts to extract the audio duration when `params.data.file` is present and populate `data.duration`.
 * Any extraction errors are logged and do not block the request.
 *
 * @param context - The middleware context containing `uid`, `action`, and `params` (including `data` and optional `strapi`)
 * @param next - The next middleware function in the chain
 * @returns The value returned by the next middleware
 */
export async function durationMiddleware(
    context: {uid: string; action: string; params?: any},
    next: () => Promise<unknown>,
): Promise<unknown> {
    // Only process podcast content type for create/update actions
    if (context.uid === 'api::podcast.podcast' && ['create', 'update'].includes(context.action)) {
        try {
            const data = context.params?.data;
            if (data?.file) {
                const strapiInstance = context.params?.strapi;
                if (strapiInstance) {
                    await extractDuration(strapiInstance, data);
                }
            }
        } catch (error) {
            // Log error but don't block the operation
            const strapiInstance = context.params?.strapi;
            if (strapiInstance?.log) {
                strapiInstance.log.warn('Failed to extract podcast duration:', error);
            }
        }
    }
    return next();
}
