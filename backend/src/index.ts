import {wordCountMiddleware} from './middlewares/wordCount';
import {durationMiddleware} from './middlewares/duration';
import {cacheInvalidationMiddleware} from './middlewares/cacheInvalidation';
import {restorePendingInvalidations, type StrapiWithDb} from './services/cacheInvalidationQueue';
import {runGracefulShutdown, registerShutdownHandlers} from './utils/gracefulShutdown';
import {isValidBaseDomain} from './utils/envChecks';
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
    server: {
        httpServer: HttpServer;
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
            'BASE_DOMAIN',
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
            const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}. Please check your .env file.`;
            strapi.log.error(errorMsg);
            throw new Error(errorMsg);
        }

        // `BASE_DOMAIN` is concatenated with media paths to build absolute
        // cover URLs, so a bare host would boot and silently produce relative
        // ones; require the documented absolute origin shape.
        if (process.env.BASE_DOMAIN && !isValidBaseDomain(process.env.BASE_DOMAIN)) {
            const errorMsg = `Invalid BASE_DOMAIN: "${process.env.BASE_DOMAIN}". Expected an absolute origin like https://cms.m10z.de (http(s)://host[:port], no path). Please check your .env file.`;
            strapi.log.error(errorMsg);
            throw new Error(errorMsg);
        }

        // `FRONTEND_URL` selects the cache-invalidation target. In production a
        // missing value would fall back to http://localhost:3000 and silently
        // drop every invalidation (POSTing the shared secret to the wrong host),
        // so it is required there; dev/test keep the localhost fallback.
        // `STRAPI_INVALIDATION_SECRET` is required for the same reason: without it
        // every invalidation is skipped, the queue dead-letters the events, and
        // content silently stops reaching the frontend.
        if (process.env.NODE_ENV === 'production') {
            // `.trim()` so a whitespace-only value counts as missing: it would pass
            // this check and then be sent as the header value, 401 every request and
            // dead-letter the queue.
            const missingProductionVars = ['FRONTEND_URL', 'STRAPI_INVALIDATION_SECRET'].filter(
                varName => !process.env[varName]?.trim()
            );

            if (missingProductionVars.length > 0) {
                const errorMsg = `Missing required environment variable(s) in production: ${missingProductionVars.join(', ')}. Please check your .env file.`;
                strapi.log.error(errorMsg);
                throw new Error(errorMsg);
            }
        }

        // Validate optional but important environment variables
        const importantVars = [
            'DIAGNOSTICS_TOKEN',
        ];

        const missingImportantVars = importantVars.filter(varName => !process.env[varName]);

        if (missingImportantVars.length > 0) {
            strapi.log.warn(`Missing optional but recommended environment variables: ${missingImportantVars.join(', ')}`);
        }
        // Configure HTTP server timeouts to prevent premature socket closure
        // during SSR requests. `strapi.server` resolves the server service on
        // access, so `httpServer` exists here without a retry loop.
        configureServerTimeouts(strapi.server.httpServer);
        strapi.log.info('HTTP server timeouts configured (keepAlive: 65s, headers: 66s, request: 30m)');
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
        const gracefulShutdown = (signal: string, exitCode = 0) => {
            const db = strapi.db;
            return runGracefulShutdown({
                signal,
                exitCode,
                log: strapi.log,
                httpServer: strapi.server?.httpServer,
                closeDatabase: db ? () => db.connection.destroy() : undefined,
                exit: (code) => process.exit(code),
            });
        };

        // Register shutdown handlers: a requested stop exits 0, a fatal crash
        // (uncaughtException) exits 1 so supervision and alerting see the failure.
        registerShutdownHandlers(process, gracefulShutdown, strapi.log);

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
