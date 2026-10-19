/**
 * Graceful-shutdown sequence for the Strapi backend.
 *
 * Extracted from `src/index.ts` so the ordering and the exit code can be unit
 * tested without booting Strapi. The one ordering rule that matters: the
 * force-exit watchdog must be armed *before* `httpServer.close()` is awaited,
 * because Node only calls `close()`'s callback once every open connection has
 * ended — up to `keepAliveTimeout` (65s on this server) with an idle keep-alive
 * socket, and unbounded with a stalled request.
 */

/** Structural logger contract (Strapi's logger satisfies it). */
export type ShutdownLogger = {
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
};

/** Minimal HTTP-server surface the shutdown needs. */
export type ShutdownHttpServer = {
    close: (callback: (err?: Error) => void) => unknown;
    closeIdleConnections?: () => void;
};

export type GracefulShutdownOptions = {
    /** Trigger label used in logs, e.g. `SIGTERM` or `uncaughtException`. */
    signal: string;
    log: ShutdownLogger;
    /** Process exit code on a clean shutdown. @default 0 */
    exitCode?: number;
    httpServer?: ShutdownHttpServer;
    closeDatabase?: () => Promise<void>;
    /** Force-exit watchdog in ms. @default 30000 */
    timeoutMs?: number;
    /** Defaults to `process.exit`; injectable for tests. */
    exit?: (code: number) => void;
};

/**
 * Stop accepting requests, close the database, then exit.
 *
 * Arms the watchdog before awaiting `close()` (the step it exists to bound) and
 * drops idle keep-alive sockets so `close()` can call back promptly.
 */
export async function runGracefulShutdown({
    signal,
    log,
    exitCode = 0,
    httpServer,
    closeDatabase,
    timeoutMs = 30000,
    exit = (code) => process.exit(code),
}: GracefulShutdownOptions): Promise<void> {
    log.info(`Received ${signal}, starting graceful shutdown...`);

    // Arm the watchdog *before* the awaited close(). Arming it afterwards would
    // not cover the one operation that can block for minutes.
    const watchdog = setTimeout(() => {
        log.warn('Shutdown timeout exceeded, forcing exit');
        exit(1);
    }, timeoutMs);

    try {
        if (httpServer) {
            log.info('Closing HTTP server...');
            await new Promise<void>((resolve, reject) => {
                httpServer.close((err?: Error) => {
                    if (err) {
                        log.error('Error closing HTTP server:', err);
                        reject(err);
                    } else {
                        log.info('HTTP server closed successfully');
                        resolve();
                    }
                });
                // Drop idle keep-alive sockets now that new connections are
                // refused, so the close() callback cannot wait out the 65s
                // keepAliveTimeout.
                httpServer.closeIdleConnections?.();
            });
        }

        if (closeDatabase) {
            log.info('Closing database connections...');
            await closeDatabase();
            log.info('Database connections closed');
        }

        clearTimeout(watchdog);
        log.info('Graceful shutdown completed');
        exit(exitCode);
    } catch (error) {
        clearTimeout(watchdog);
        log.error('Error during graceful shutdown:', error);
        exit(1);
    }
}
