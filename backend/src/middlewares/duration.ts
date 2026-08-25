/**
 * Duration extraction middleware for podcasts.
 *
 * Extracts audio duration from podcast audio files and sets it in the data object.
 */

import {parseFile} from 'music-metadata';
import {existsSync} from 'fs';

import {normalizeFileIdentity, resolveFileWithinPublicDir} from './durationFile';
import type {
    DocumentServiceContext,
    DocumentServiceNext,
    FileReference,
    PodcastDocument,
    StrapiInstance,
} from '../types/middleware';

async function getExistingPodcastFileIdentity(
    strapi: StrapiInstance,
    documentId?: string | number,
): Promise<string | null> {
    if (!documentId) return null;
    try {
        const podcast = await strapi.documents('api::podcast.podcast').findOne({
            documentId,
            populate: ['file'],
        });
        return normalizeFileIdentity(podcast?.file);
    } catch (error) {
        strapi.log.warn('Failed to load podcast for duration comparison:', error);
        return null;
    }
}

/**
 * Extracts audio duration from the podcast file referenced by `data.file` and sets `data.duration` to the rounded number of seconds.
 *
 * Attempts to locate the file URL from `data.file` (object with `url`, numeric/string id, `id`, or `documentId`), resolves the path inside Strapi's public directory, reads audio metadata, and updates `data.duration` when a positive duration is found. Errors are logged and do not interrupt the save operation.
 *
 * @param data - The entity data being saved; if a file is present its duration will be assigned to `data.duration` as an integer number of seconds
 */
async function extractDuration(strapi: StrapiInstance, data: PodcastDocument): Promise<void> {
    try {
        // Check if file is already populated with URL (common in Strapi)
        let fileUrl: string | undefined;

        const rawFile = data.file;
        if (Array.isArray(rawFile)) {
            // A to-many relation carries no single file identity of its own.
            strapi.log.debug('No file ID found in podcast data');
            return;
        }
        const fileRef: number | string | FileReference | undefined = rawFile;

        if (typeof fileRef === 'object' && fileRef !== null && fileRef.url) {
            // File object already contains URL
            fileUrl = fileRef.url;
        } else if (fileRef !== undefined) {
            // Extract file identifier (can be ID, documentId, or object with id/documentId)
            let fileId: number | string | undefined;
            if (typeof fileRef === 'number' || typeof fileRef === 'string') {
                fileId = fileRef;
            } else if (fileRef.id) {
                fileId = fileRef.id;
            } else if (fileRef.documentId) {
                fileId = fileRef.documentId;
            }

            if (!fileId) {
                strapi.log.debug('No file ID found in podcast data');
                return;
            }

            // Query upload file record
            const uploadRecord = await strapi.documents('plugin::upload.file').findOne({
                documentId: fileId,
            });

            if (!uploadRecord) {
                strapi.log.warn(`Upload file record not found for ID: ${fileId}`);
                return;
            }

            // Extract file URL from record
            fileUrl = typeof uploadRecord.url === 'string' ? uploadRecord.url : undefined;
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

        // Security: resolve within the public directory to prevent path traversal.
        const filePath = resolveFileWithinPublicDir(publicDir, fileUrl);
        if (!filePath) {
            strapi.log.warn(`File path outside public directory for url: ${fileUrl}`);
            return;
        }

        // Check if file exists
        if (!existsSync(filePath)) {
            strapi.log.warn(`Audio file does not exist at path: ${filePath}`);
            return;
        }

        const metadata = await parseFile(filePath);
        const duration = metadata.format?.duration;

        if (duration && typeof duration === 'number' && duration > 0) {
            data.duration = Math.round(duration);
            strapi.log.info(`Extracted duration: ${data.duration} seconds for file: ${fileUrl}`);
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
    context: DocumentServiceContext,
    next: DocumentServiceNext,
): Promise<unknown> {
    // Only process podcast content type for create/update actions
    if (context.uid === 'api::podcast.podcast' && ['create', 'update'].includes(context.action)) {
        const strapiInstance = context.params?.strapi;
        // Same guard as the wordCount middleware: without a Strapi instance there is
        // nothing to query — continue the chain instead of blocking the save.
        if (!strapiInstance) return next();

        try {
            const data = context.params?.data;
            // Only podcast payloads carry the `file` relation this middleware needs.
            if (data && 'file' in data && !Array.isArray(data.file) && data.file) {
                const podcastData: PodcastDocument = data;
                if (context.action === 'update') {
                    const documentId =
                        context.params?.documentId ||
                        context.params?.where?.documentId ||
                        context.params?.where?.id ||
                        podcastData.documentId ||
                        podcastData.id;
                    const existingIdentity = await getExistingPodcastFileIdentity(
                        strapiInstance,
                        documentId,
                    );
                    const incomingIdentity = normalizeFileIdentity(podcastData.file);
                    if (
                        existingIdentity &&
                        incomingIdentity &&
                        existingIdentity === incomingIdentity
                    ) {
                        strapiInstance.log.info(
                            `Skipping duration recalculation (file unchanged) for podcast: ${documentId}`,
                        );
                        return next();
                    }
                }
                await extractDuration(strapiInstance, podcastData);
            }
        } catch (error) {
            // Log error but don't block the operation
            strapiInstance.log.warn('Failed to extract podcast duration:', error);
        }
    }
    return next();
}
