import {type Server} from 'http';
import {generateMissingBlurhashes} from '../src/cron/blurhash';
import {generateMissingWordCounts} from '../src/cron/wordcount';
import {rebuildSearchIndex} from '../src/cron/searchIndex';

/**
 * Configures HTTP server timeout settings to prevent premature socket closure
 * during SSR requests.
 *
 * These timeout properties must be set on the Server instance after creation,
 * as they are not options that can be passed to http.createServer().
 * See: https://nodejs.org/api/http.html#serverkeepalivetimeout
 *
 * Timeout relationships:
 * - keepAliveTimeout: Duration the server keeps a connection open after responding,
 *   waiting for the next request. Set to 65 seconds to align with client expectations
 *   and prevent premature socket closure during SSR requests.
 *
 * - headersTimeout: Maximum time the server waits to receive complete HTTP headers.
 *   Set to 66 seconds (1 second more than keepAliveTimeout) to ensure headers are
 *   received before the keep-alive timeout expires.
 *
 * - requestTimeout: Maximum time to receive the entire request from the client.
 *   Set to 120 seconds to balance between allowing sufficient time for long-running
 *   SSR requests and mitigating potential denial-of-service attacks.
 *
 * @param server - The HTTP server instance to configure
 */
export function configureServerTimeouts(server: Server): void {
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds
    server.requestTimeout = 120000; // 120 seconds
}

export default ({env}) => ({
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    app: {
        keys: env.array('APP_KEYS'),
    },
    /**
     * HTTP server configuration.
     * Note: Timeout settings (keepAliveTimeout, headersTimeout, requestTimeout) are
     * Server instance properties that must be set after the server is created.
     * They are configured in src/index.ts register() hook via configureServerTimeouts().
     * See: https://docs.strapi.io/dev-docs/configurations/server#http
     */
    http: {
        serverOptions: {
            // Additional server options can be added here if needed
            // Timeout properties are set on the server instance in src/index.ts
        },
    },
    logger: {
        // https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/server-default-log-level#manual-migration
        config: {
            level: env('LOG_LEVEL', 'debug'),
        },
    },
    cron: {
        enabled: true,
        tasks: {
            // Generate blurhash for images missing it - runs once nightly
            generateMissingBlurhashes: {
                task: generateMissingBlurhashes,
                options: {
                    rule: '0 3 * * *', // Run nightly at 03:00 (server local time)
                },
            },
            // Generate wordCount for articles and podcasts missing it - runs once nightly
            generateMissingWordCounts: {
                task: generateMissingWordCounts,
                options: {
                    rule: '15 3 * * *', // Run nightly at 03:15 (server local time)
                },
            },
            // Rebuild search index - runs once nightly
            rebuildSearchIndex: {
                task: rebuildSearchIndex,
                options: {
                    rule: '30 3 * * *', // Run nightly at 03:30 (server local time)
                },
            },
        },
    },
});
