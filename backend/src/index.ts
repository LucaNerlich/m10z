import {wordCountMiddleware} from './middlewares/wordCount';
import {durationMiddleware} from './middlewares/duration';
import {cacheInvalidationMiddleware} from './middlewares/cacheInvalidation';
import {restorePendingInvalidations, type StrapiWithDb} from './services/cacheInvalidationQueue';
import {configureServerTimeouts} from '../config/server';
import type {Server as HttpServer} from 'http';
import {
    type DocumentServiceContext,
    type DocumentServiceNext,
    type DatabaseLike,
    type DocumentsService,
} from './types/middleware';

/**
 * Structural contract for the Strapi instance as seen from `register`/`bootstrap`:
 * the invalidation-queue surface plus document service, server, and plugin access
 * used at boot.
 */
type AppStrapi = StrapiWithDb & {
    log: {
        debug: (message: string, ...args: unknown[]) => void;
        info: (message: string, ...args: unknown[]) => void;
        warn: (message: string, ...args: unknown[]) => void;
        error: (message: string, ...args: unknown[]) => void;
    };
    db?: DatabaseLike;
    server?: {
        httpServer?: HttpServer;
    };
    documents: DocumentsService;
    plugin?: (name: string) =>
        | {
            contentTypes?: {
                file?: {
                    attributes?: Record<string, unknown>;
                };
            };
          }
        | undefined;
};

export default {
    /**
     * Register middleware on the Document Service to invalidate
     * the Next.js frontend after successful mutations.
     */
    register({strapi}: {strapi: AppStrapi}) {
        // Validate required environment variables at startup
        const requiredEnvVars = [
            'DATABASE_CLIENT',
            'DATABASE_HOST',
            'DATABASE_PORT',
            'DATABASE_NAME',
            'DATABASE_USERNAME',
            'DATABASE_PASSWORD',
            'ADMIN_JWT_SECRET',
            'API_TOKEN_SALT',
            'STRAPI_PREVIEW_SECRET',
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
            const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}. Please check your .env file.`;
            strapi.log.error(errorMsg);
            throw new Error(errorMsg);
        }

        // Validate optional but important environment variables
        const importantVars = [
            'STRAPI_INVALIDATION_SECRET',
            'DIAGNOSTICS_TOKEN',
        ];

        const missingImportantVars = importantVars.filter(varName => !process.env[varName]);

        if (missingImportantVars.length > 0) {
            strapi.log.warn(`Missing optional but recommended environment variables: ${missingImportantVars.join(', ')}`);
        }
        // Configure HTTP server timeouts to prevent premature socket closure
        // during SSR requests. The server may not be initialized immediately,
        // so we use a timeout to retry if needed.
        const MAX_RETRIES = process.env.STRAPI_SERVER_CONFIG_MAX_RETRIES
            ? parseInt(process.env.STRAPI_SERVER_CONFIG_MAX_RETRIES, 10)
            : 50; // Default: 50 retries * 100ms = 5 seconds total
        let retryCount = 0;

        const configureServer = () => {
            const httpServer = strapi.server?.httpServer;
            if (httpServer) {
                configureServerTimeouts(httpServer);
                strapi.log.info('HTTP server timeouts configured (keepAlive: 65s, headers: 66s, request: 120s)');
            } else {
                retryCount++;
                if (retryCount >= MAX_RETRIES) {
                    strapi.log.error(
                        `Failed to configure HTTP server timeouts: server never became ready after ${MAX_RETRIES} attempts (${MAX_RETRIES * 100}ms). Server timeouts may not be configured correctly.`,
                    );
                    return;
                }
                // Retry after a short delay if server isn't ready yet
                setTimeout(configureServer, 100);
            }
        };
        configureServer();
        // Extend upload file schema with blurhash attribute (stores base64 data URL)
        const uploadFileAttributes = strapi.plugin?.('upload')?.contentTypes?.file?.attributes;
        if (uploadFileAttributes) {
            uploadFileAttributes.blurhash = {
                type: 'text', // Use text instead of string for longer base64 data URLs
            };
        }

        // Register middleware functions in order:
        // 1. wordCountMiddleware (runs before save)
        // 2. durationMiddleware (runs before save)
        // 3. cacheInvalidationMiddleware (runs after save)

        strapi.documents.use(async (context: DocumentServiceContext, next: DocumentServiceNext) => {
            // Pass strapi to context params so middleware can access it
            if (!context.params) {
                context.params = {};
            }
            context.params.strapi = strapi;
            return wordCountMiddleware(context, next);
        });

        strapi.documents.use(async (context: DocumentServiceContext, next: DocumentServiceNext) => {
            // Pass strapi to context params so middleware can access it
            if (!context.params) {
                context.params = {};
            }
            context.params.strapi = strapi;
            return durationMiddleware(context, next);
        });

        strapi.documents.use(async (context: DocumentServiceContext, next: DocumentServiceNext) => {
            // Pass strapi to context params so middleware can access it
            if (!context.params) {
                context.params = {};
            }
            context.params.strapi = strapi;
            return cacheInvalidationMiddleware(context, next);
        });
    },

    /**
     * Strapi bootstrap: runs before the app starts.
     */
    async bootstrap({strapi}: {strapi: AppStrapi}) {
        // Add blurhash column to files table if it doesn't exist
        // This ensures the database column exists even if schema extension happens after DB init
        try {
            const db = strapi.db;
            const tableName = 'files';
            const columnName = 'blurhash';

            // Parameterized query to avoid SQL injection
            const columnCheck = await db.connection.raw(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = ?
                  AND column_name = ?
                  AND table_schema = current_schema()
            `, [tableName, columnName]);

            const columnExists = columnCheck.rows && columnCheck.rows.length > 0;

            if (!columnExists) {
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

        // Set up database connection pool monitoring
        try {
            const db = strapi.db;
            const connection = db.connection;
            const client = connection?.client;

            if (client?.pool) {
                const pool = client.pool;

                // Helper function to get pool metrics
                const getPoolMetrics = () => {
                    const numUsed = pool.numUsed();
                    const numFree = pool.numFree();
                    const numPendingAcquires = pool.numPendingAcquires();
                    return {
                        active: numUsed,
                        idle: numFree,
                        waiting: numPendingAcquires,
                        total: numUsed + numFree,
                    };
                };

                pool.on('acquireFail', (err: Error) => {
                    const metrics = getPoolMetrics();
                    strapi.log.error('Database connection acquisition failed', {
                        error: err.message,
                        ...metrics,
                    });
                });

                strapi.log.info('Database pool monitoring enabled');

                // Periodic pool health logging in development
                const poolMax = parseInt(process.env.DATABASE_POOL_MAX || '25', 10);
                if (process.env.NODE_ENV === 'development') {
                    const healthInterval = setInterval(() => {
                        const metrics = getPoolMetrics();
                        strapi.log.info('Database pool health', metrics);

                        if (metrics.waiting > 0) {
                            strapi.log.warn('Database pool has waiting requests - consider increasing pool size', metrics);
                        }
                        if (metrics.total > poolMax) {
                            strapi.log.warn(`Database pool exceeds max connections (${poolMax}) - potential connection leak`, metrics);
                        }
                    }, 60000);

                    process.on('SIGTERM', () => {
                        clearInterval(healthInterval);
                    });
                    process.on('SIGINT', () => {
                        clearInterval(healthInterval);
                    });
                }
            } else {
                strapi.log.warn('Database pool not available for monitoring');
            }
        } catch (err) {
            strapi.log.warn('Failed to set up database pool monitoring', err);
        }

        // Set up graceful shutdown handler
        const gracefulShutdown = async (signal: string) => {
            strapi.log.info(`Received ${signal}, starting graceful shutdown...`);

            try {
                // Stop accepting new requests
                const httpServer = strapi.server?.httpServer;
                if (httpServer) {
                    strapi.log.info('Closing HTTP server...');
                    await new Promise<void>((resolve, reject) => {
                        httpServer.close((err: unknown) => {
                            if (err) {
                                strapi.log.error('Error closing HTTP server:', err);
                                reject(err);
                            } else {
                                strapi.log.info('HTTP server closed successfully');
                                resolve();
                            }
                        });
                    });
                }

                // Wait for pending operations to complete (with timeout)
                const shutdownTimeout = setTimeout(() => {
                    strapi.log.warn('Shutdown timeout exceeded, forcing exit');
                    process.exit(1);
                }, 30000); // 30 second timeout

                // Close database connections
                if (strapi.db) {
                    strapi.log.info('Closing database connections...');
                    await strapi.db.connection.destroy();
                    strapi.log.info('Database connections closed');
                }

                clearTimeout(shutdownTimeout);
                strapi.log.info('Graceful shutdown completed');
                process.exit(0);
            } catch (error) {
                strapi.log.error('Error during graceful shutdown:', error);
                process.exit(1);
            }
        };

        // Register shutdown handlers
        process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.once('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions and rejections
        process.on('uncaughtException', (error) => {
            strapi.log.error('Uncaught Exception:', error);
            gracefulShutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            strapi.log.error('Unhandled Rejection at:', promise, 'reason:', reason);
            // Not calling gracefulShutdown here as unhandled rejections are often recoverable
        });

        // Recover invalidation events that were persisted before the last shutdown so
        // they are delivered after a restart (the whole point of the durable queue).
        // Failures are logged, never fatal to boot.
        try {
            await restorePendingInvalidations(strapi);
        } catch (error) {
            strapi.log.warn('Failed to restore pending cache invalidation events.', error);
        }
    },
};
