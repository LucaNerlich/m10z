import {buildAndPersistSearchIndex} from './services/searchIndexBuilder';
import {wordCountMiddleware} from './middlewares/wordCount';
import {durationMiddleware} from './middlewares/duration';
import {cacheInvalidationMiddleware} from './middlewares/cacheInvalidation';

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

        // Register middleware functions in order:
        // 1. wordCountMiddleware (runs before save)
        // 2. durationMiddleware (runs before save)
        // 3. cacheInvalidationMiddleware (runs after save)

        strapi.documents.use(async (context, next) => {
            // Pass strapi to context params so middleware can access it
            if (!context.params) {
                context.params = {};
            }
            context.params.strapi = strapi;
            return wordCountMiddleware(context, next);
        });

        strapi.documents.use(async (context, next) => {
            // Pass strapi to context params so middleware can access it
            if (!context.params) {
                context.params = {};
            }
            context.params.strapi = strapi;
            return durationMiddleware(context, next);
        });

        strapi.documents.use(async (context, next) => {
            // Pass strapi to context params so middleware can access it
            if (!context.params) {
                context.params = {};
            }
            context.params.strapi = strapi;
            return cacheInvalidationMiddleware(context, next);
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
    },
};
