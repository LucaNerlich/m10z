import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

let runGracefulShutdown: typeof import('./gracefulShutdown').runGracefulShutdown;
let registerShutdownHandlers: typeof import('./gracefulShutdown').registerShutdownHandlers;

beforeEach(async () => {
    // The re-entrancy guard is module state, so reload the module to give each
    // test a fresh shutdown sequence.
    vi.resetModules();
    ({runGracefulShutdown, registerShutdownHandlers} = await import('./gracefulShutdown'));
});

function makeLogger() {
    return {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('runGracefulShutdown', () => {
    test('arms the force-exit watchdog before close() and drops idle connections', async () => {
        vi.useFakeTimers();
        const log = makeLogger();
        const exit = vi.fn();
        let timersArmedAtClose = -1;
        let closeCallback: ((err?: Error) => void) | undefined;
        const httpServer = {
            close: vi.fn((callback: (err?: Error) => void) => {
                timersArmedAtClose = vi.getTimerCount();
                closeCallback = callback;
            }),
            closeIdleConnections: vi.fn(),
        };

        const promise = runGracefulShutdown({
            signal: 'SIGTERM',
            log,
            httpServer,
            exit,
            timeoutMs: 30000,
        });

        // close() has been called, with the watchdog and the idle sweep armed.
        expect(closeCallback).toBeDefined();
        expect(timersArmedAtClose).toBe(2);
        expect(httpServer.closeIdleConnections).toHaveBeenCalledTimes(1);

        closeCallback?.(undefined);
        await promise;

        expect(exit).toHaveBeenCalledWith(0);
    });

    test('keeps sweeping idle connections until close() calls back', async () => {
        vi.useFakeTimers();
        const log = makeLogger();
        const exit = vi.fn();
        let closeCallback: ((err?: Error) => void) | undefined;
        // The socket is still serving a request when shutdown starts, so the
        // immediate sweep cannot drop it; it only becomes idle later.
        let requestInFlight = true;
        const httpServer = {
            close: vi.fn((callback: (err?: Error) => void) => {
                closeCallback = callback;
            }),
            closeIdleConnections: vi.fn(() => {
                if (!requestInFlight) {
                    closeCallback?.(undefined);
                }
            }),
        };

        const promise = runGracefulShutdown({
            signal: 'SIGTERM',
            log,
            httpServer,
            exit,
            timeoutMs: 30000,
        });

        // The immediate sweep ran, but the in-flight socket survived it.
        expect(httpServer.closeIdleConnections).toHaveBeenCalledTimes(1);
        requestInFlight = false;

        await vi.advanceTimersByTimeAsync(500);

        expect(httpServer.closeIdleConnections.mock.calls.length).toBeGreaterThan(1);
        expect(exit).toHaveBeenCalledWith(0);
        expect(exit).not.toHaveBeenCalledWith(1);

        await promise;
    });

    test('forces exit 1 when close() never calls back', async () => {
        vi.useFakeTimers();
        const log = makeLogger();
        const exit = vi.fn();
        const httpServer = {close: vi.fn(), closeIdleConnections: vi.fn()};

        void runGracefulShutdown({signal: 'SIGTERM', log, httpServer, exit, timeoutMs: 30000});

        expect(exit).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(30000);
        expect(exit).toHaveBeenCalledWith(1);
        expect(log.warn).toHaveBeenCalledWith('Shutdown timeout exceeded, forcing exit');
    });

    test('closes the database then exits with the requested code', async () => {
        const log = makeLogger();
        const exit = vi.fn();
        const closeDatabase = vi.fn().mockResolvedValue(undefined);
        const httpServer = {
            close: (callback: (err?: Error) => void) => callback(undefined),
            closeIdleConnections: vi.fn(),
        };

        await runGracefulShutdown({
            signal: 'SIGTERM',
            exitCode: 1,
            log,
            httpServer,
            closeDatabase,
            exit,
        });

        expect(closeDatabase).toHaveBeenCalledTimes(1);
        // Pins the pass-through end to end: hardcoding exit(0) must fail here.
        expect(exit).toHaveBeenCalledWith(1);
    });

    test('gives the database step a fresh watchdog after a slow close', async () => {
        vi.useFakeTimers();
        const log = makeLogger();
        const exit = vi.fn();
        const closeDatabase = vi.fn(async () => {
            await new Promise((resolve) => setTimeout(resolve, 20000));
        });
        const httpServer = {
            close: (callback: (err?: Error) => void) => {
                setTimeout(() => callback(undefined), 25000);
            },
            closeIdleConnections: vi.fn(),
        };

        const promise = runGracefulShutdown({
            signal: 'SIGTERM',
            log,
            httpServer,
            closeDatabase,
            exit,
            timeoutMs: 30000,
        });

        // The close eats 25s of its 30s budget; the destroy then needs 20s.
        await vi.advanceTimersByTimeAsync(30000);

        expect(closeDatabase).toHaveBeenCalledTimes(1);
        // A watchdog shared with close() would have forced exit 1 here,
        // mid-destroy.
        expect(exit).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(20000);
        await promise;

        expect(exit).toHaveBeenCalledTimes(1);
        expect(exit).toHaveBeenCalledWith(0);
    });

    test('exits 1 when closing the database fails', async () => {
        const log = makeLogger();
        const exit = vi.fn();
        const closeDatabase = vi.fn().mockRejectedValue(new Error('boom'));

        await runGracefulShutdown({signal: 'SIGTERM', log, closeDatabase, exit});

        expect(exit).toHaveBeenCalledWith(1);
        expect(log.error).toHaveBeenCalled();
    });

    test('runs the shutdown sequence only once', async () => {
        const log = makeLogger();
        const exit = vi.fn();
        let closeCallback: ((err?: Error) => void) | undefined;
        let closeCalls = 0;
        const httpServer = {
            close: vi.fn((callback: (err?: Error) => void) => {
                closeCalls += 1;
                if (closeCalls === 1) {
                    closeCallback = callback;
                } else {
                    // What Node answers when close() is called twice.
                    callback(Object.assign(new Error('Server is not running'), {code: 'ERR_SERVER_NOT_RUNNING'}));
                }
            }),
            closeIdleConnections: vi.fn(),
        };

        const first = runGracefulShutdown({
            signal: 'SIGTERM',
            log,
            exitCode: 0,
            httpServer,
            exit,
        });

        // A second signal lands while the first shutdown is still closing the
        // HTTP server. It must not call close() again (ERR_SERVER_NOT_RUNNING)
        // or abort the in-progress shutdown with exit 1.
        await runGracefulShutdown({
            signal: 'SIGINT',
            log,
            exitCode: 1,
            httpServer,
            exit,
        });

        expect(httpServer.close).toHaveBeenCalledTimes(1);
        expect(exit).not.toHaveBeenCalled();

        closeCallback?.(undefined);
        await first;

        expect(exit).toHaveBeenCalledTimes(1);
        expect(exit).toHaveBeenCalledWith(0);
    });
});

describe('registerShutdownHandlers', () => {
    function makeProcess() {
        const handlers: Record<string, (...args: unknown[]) => void> = {};
        return {
            handlers,
            processLike: {
                once: (event: string, listener: (...args: unknown[]) => void) => {
                    handlers[event] = listener;
                },
                on: (event: string, listener: (...args: unknown[]) => void) => {
                    handlers[event] = listener;
                },
            },
        };
    }

    test('a requested stop exits 0, a fatal crash exits 1', () => {
        const {handlers, processLike} = makeProcess();
        const log = makeLogger();
        const shutdown = vi.fn();

        registerShutdownHandlers(processLike, shutdown, log);

        handlers.SIGTERM();
        expect(shutdown).toHaveBeenLastCalledWith('SIGTERM', 0);

        handlers.SIGINT();
        expect(shutdown).toHaveBeenLastCalledWith('SIGINT', 0);

        handlers.uncaughtException(new Error('boom'));
        expect(shutdown).toHaveBeenLastCalledWith('uncaughtException', 1);
        expect(log.error).toHaveBeenCalledWith('Uncaught Exception:', expect.any(Error));
    });

    test('an unhandled rejection is logged but does not trigger a shutdown', () => {
        const {handlers, processLike} = makeProcess();
        const log = makeLogger();
        const shutdown = vi.fn();

        registerShutdownHandlers(processLike, shutdown, log);
        handlers.unhandledRejection('reason', Promise.resolve());

        expect(shutdown).not.toHaveBeenCalled();
        expect(log.error).toHaveBeenCalled();
    });
});
