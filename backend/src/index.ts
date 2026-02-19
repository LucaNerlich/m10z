import {wordCountMiddleware} from './middlewares/wordCount';
import {durationMiddleware} from './middlewares/duration';
import {cacheInvalidationMiddleware} from './middlewares/cacheInvalidation';
import {configureServerTimeouts} from '../config/server';

export default {
    /**
     * Register middleware on the Document Service to invalidate
     * the Next.js frontend after successful mutations.
     */
    register({strapi}: {strapi: any}) {
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
            'FEED_INVALIDATION_TOKEN',
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
            if (strapi.server?.httpServer) {
                configureServerTimeouts(strapi.server.httpServer);
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

                // Event handler for successful connection acquisition
                pool.on('acquireSuccess', () => {
                    const metrics = getPoolMetrics();
                    strapi.log.debug('Database connection acquired', metrics);
                });

                // Event handler for failed connection acquisition
                pool.on('acquireFail', (err: Error) => {
                    const metrics = getPoolMetrics();
                    strapi.log.error('Database connection acquisition failed', {
                        error: err.message,
                        ...metrics,
                    });
                });

                // Event handler for connection destruction
                pool.on('destroySuccess', () => {
                    const metrics = getPoolMetrics();
                    strapi.log.debug('Database connection destroyed', metrics);
                });

                strapi.log.info('Database pool monitoring enabled');

                // Periodic pool health logging in development
                if (process.env.NODE_ENV === 'development') {
                    const healthInterval = setInterval(() => {
                        const metrics = getPoolMetrics();
                        strapi.log.info('Database pool health', metrics);

                        // Metric interpretation:
                        // - High 'waiting' count indicates pool exhaustion - consider increasing max
                        // - 'active' + 'idle' should not exceed 'max' (25)
                        // - Monitor for connection leaks (idle connections not being released)
                        if (metrics.waiting > 0) {
                            strapi.log.warn('Database pool has waiting requests - consider increasing pool size', metrics);
                        }
                        if (metrics.total > 25) {
                            strapi.log.warn('Database pool exceeds max connections - potential connection leak', metrics);
                        }
                    }, 60000); // Every 60 seconds

                    // Clear interval on application shutdown
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
                if (strapi.server?.httpServer) {
                    strapi.log.info('Closing HTTP server...');
                    await new Promise<void>((resolve, reject) => {
                        strapi.server.httpServer.close((err) => {
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

                // Clear all intervals and timers
                clearTimeout(shutdownTimeout);

                // Close database connections
                if (strapi.db) {
                    strapi.log.info('Closing database connections...');
                    await strapi.db.connection.destroy();
                    strapi.log.info('Database connections closed');
                }

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
    },
};
