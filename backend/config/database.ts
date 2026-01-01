import path from 'path';

export default ({env}) => {
    const client = env('DATABASE_CLIENT', 'sqlite');

    const connections = {
        mysql: {
            connection: {
                host: env('DATABASE_HOST', 'localhost'),
                port: env.int('DATABASE_PORT', 3306),
                database: env('DATABASE_NAME', 'strapi'),
                user: env('DATABASE_USERNAME', 'strapi'),
                password: env('DATABASE_PASSWORD', 'strapi'),
                ssl: env.bool('DATABASE_SSL', false) && {
                    key: env('DATABASE_SSL_KEY', undefined),
                    cert: env('DATABASE_SSL_CERT', undefined),
                    ca: env('DATABASE_SSL_CA', undefined),
                    capath: env('DATABASE_SSL_CAPATH', undefined),
                    cipher: env('DATABASE_SSL_CIPHER', undefined),
                    rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
                },
            },
            pool: {
                min: env.int('DATABASE_POOL_MIN', 2),
                max: env.int('DATABASE_POOL_MAX', 25),
                acquireTimeoutMillis: env.int('DATABASE_ACQUIRE_TIMEOUT_MILLIS', 30000),
                idleTimeoutMillis: env.int('DATABASE_IDLE_TIMEOUT_MILLIS', 30000),
            },
        },
        postgres: {
            connection: {
                connectionString: env('DATABASE_URL'),
                host: env('DATABASE_HOST', 'localhost'),
                port: env.int('DATABASE_PORT', 5432),
                database: env('DATABASE_NAME', 'strapi'),
                user: env('DATABASE_USERNAME', 'strapi'),
                password: env('DATABASE_PASSWORD', 'strapi'),
                ssl: env.bool('DATABASE_SSL', false) && {
                    key: env('DATABASE_SSL_KEY', undefined),
                    cert: env('DATABASE_SSL_CERT', undefined),
                    ca: env('DATABASE_SSL_CA', undefined),
                    capath: env('DATABASE_SSL_CAPATH', undefined),
                    cipher: env('DATABASE_SSL_CIPHER', undefined),
                    rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
                },
                schema: env('DATABASE_SCHEMA', 'public'),
            },
            pool: {
                min: env.int('DATABASE_POOL_MIN', 2),
                max: env.int('DATABASE_POOL_MAX', 25),
                acquireTimeoutMillis: env.int('DATABASE_ACQUIRE_TIMEOUT_MILLIS', 30000),
                idleTimeoutMillis: env.int('DATABASE_IDLE_TIMEOUT_MILLIS', 30000),
            },
        },
        sqlite: {
            connection: {
                filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
            },
            useNullAsDefault: true,
        },
    };

    return {
        connection: {
            client,
            ...connections[client],
            /**
             * Database connection pool configuration:
             *
             * Pool sizing rationale:
             * - max: Increased to 25 to handle higher concurrency during SSR requests.
             *   This prevents connection exhaustion when multiple Next.js SSR requests
             *   fetch content simultaneously.
             *
             * - acquireTimeoutMillis: Set to 30 seconds to allow sufficient time
             *   for acquiring connections during peak load periods.
             *
             * - idleTimeoutMillis: Set to 30 seconds to balance between keeping connections
             *   available for reuse and releasing unused connections to manage resources efficiently.
             *
             * Note: acquireConnectionTimeout at the connection level is kept for backward
             * compatibility, but pool-level acquireTimeoutMillis takes precedence.
             */
            acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
        },
    };
};
