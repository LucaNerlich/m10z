import {afterEach, describe, expect, test, vi} from 'vitest';

import {runGracefulShutdown} from './gracefulShutdown';

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

        // close() has been called, and the watchdog already exists.
        expect(closeCallback).toBeDefined();
        expect(timersArmedAtClose).toBe(1);
        expect(httpServer.closeIdleConnections).toHaveBeenCalledTimes(1);

        closeCallback?.(undefined);
        await promise;

        expect(exit).toHaveBeenCalledWith(0);
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
            exitCode: 0,
            log,
            httpServer,
            closeDatabase,
            exit,
        });

        expect(closeDatabase).toHaveBeenCalledTimes(1);
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
});
