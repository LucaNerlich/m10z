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

/** How often to drop sockets that went idle after shutdown started. */
const IDLE_SWEEP_INTERVAL_MS = 250;

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
 * keeps dropping idle sockets until `close()` calls back.
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

    const forceExit = () => {
        log.warn('Shutdown timeout exceeded, forcing exit');
        exit(1);
    };

    // Arm the watchdog *before* the awaited close(). Arming it afterwards would
    // not cover the one operation that can block for minutes.
    let watchdog: ReturnType<typeof setTimeout> | undefined = setTimeout(forceExit, timeoutMs);

    let idleSweep: ReturnType<typeof setInterval> | undefined;

    try {
        if (httpServer) {
            log.info('Closing HTTP server...');
            await new Promise<void>((resolve, reject) => {
                // close() calls back only once every connection has ended. A
                // request still in flight when shutdown starts goes idle
                // afterwards rather than disappearing, so one sweep is not
                // enough: keep dropping idle sockets until close() calls back.
                idleSweep = setInterval(
                    () => httpServer.closeIdleConnections?.(),
                    IDLE_SWEEP_INTERVAL_MS
                );
                httpServer.close((err?: Error) => {
                    clearInterval(idleSweep);
                    idleSweep = undefined;
                    if (err) {
                        log.error('Error closing HTTP server:', err);
                        reject(err);
                    } else {
                        log.info('HTTP server closed successfully');
                        resolve();
                    }
                });
                // Drop sockets that are already idle now, so the first request
                // burst cannot hold the close() callback out to the 65s
                // keepAliveTimeout.
                httpServer.closeIdleConnections?.();
            });
        }

        // close() is bounded, so clear its watchdog and give the database step
        // a fresh budget: a slow close must not make the forced exit land
        // mid-destroy.
        clearTimeout(watchdog);
        watchdog = setTimeout(forceExit, timeoutMs);

        if (closeDatabase) {
            log.info('Closing database connections...');
            await closeDatabase();
            log.info('Database connections closed');
        }

        log.info('Graceful shutdown completed');
        exit(exitCode);
    } catch (error) {
        log.error('Error during graceful shutdown:', error);
        exit(1);
    } finally {
        clearTimeout(watchdog);
        clearInterval(idleSweep);
    }
}
