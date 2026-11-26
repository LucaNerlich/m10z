import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
    getHistoricalSearchIndexMetrics: vi.fn(() => []),
    getLastSearchIndexMetrics: vi.fn(() => null),
    checkRateLimit: vi.fn(() => ({ok: true})),
    getClientIp: vi.fn(() => '203.0.113.1'),
    verifySecret: vi.fn(() => true),
}));

vi.mock('@strapi/strapi', () => ({
    factories: {
        createCoreController: (_uid: string, factory: () => unknown) => factory,
    },
}));
vi.mock('../../../services/searchIndexBuilder', () => ({
    getHistoricalSearchIndexMetrics: mocks.getHistoricalSearchIndexMetrics,
    getLastSearchIndexMetrics: mocks.getLastSearchIndexMetrics,
}));
vi.mock('../../../utils/requestSecurity', () => ({
    checkRateLimit: mocks.checkRateLimit,
    getClientIp: mocks.getClientIp,
    verifySecret: mocks.verifySecret,
}));

import controllerFactory from './search-index';

type MetricsController = {metrics: (ctx: Record<string, unknown>) => Promise<void>};

const createController = controllerFactory as unknown as () => MetricsController;

function makeCtx(query: Record<string, unknown> = {}) {
    return {
        request: {query, headers: {'x-m10z-diagnostics-token': 'token'}},
        query,
        status: undefined as number | undefined,
        body: undefined as unknown,
        set: vi.fn(),
    };
}

afterEach(() => {
    vi.unstubAllEnvs();
});

beforeEach(() => {
    mocks.getHistoricalSearchIndexMetrics.mockClear();
    mocks.getLastSearchIndexMetrics.mockClear();
    mocks.checkRateLimit.mockClear();
    mocks.verifySecret.mockClear();
});

describe('search-index metrics controller', () => {
    test('forwards the parsed limit and lets the service cap it', async () => {
        const controller = createController();

        await controller.metrics(makeCtx({limit: '5000'}));

        expect(mocks.getHistoricalSearchIndexMetrics).toHaveBeenCalledWith(5000, undefined, undefined);
    });

    test('forwards NaN for an invalid limit so the service falls back to its default', async () => {
        const controller = createController();

        await controller.metrics(makeCtx({limit: 'abc'}));

        expect(mocks.getHistoricalSearchIndexMetrics).toHaveBeenCalledWith(Number.NaN, undefined, undefined);
    });

    test('forwards only string date bounds', async () => {
        const controller = createController();

        await controller.metrics(makeCtx({from: '2026-01-01T00:00:00.000Z', to: ['ignored']}));

        expect(mocks.getHistoricalSearchIndexMetrics).toHaveBeenCalledWith(
            Number.NaN,
            '2026-01-01T00:00:00.000Z',
            undefined,
        );
    });

    test('trims padded date bounds so they stay usable for the service', async () => {
        const controller = createController();

        await controller.metrics(
            makeCtx({from: ' 2026-01-01T00:00:00.000Z ', to: ' 2026-02-01T00:00:00.000Z '}),
        );

        expect(mocks.getHistoricalSearchIndexMetrics).toHaveBeenCalledWith(
            Number.NaN,
            '2026-01-01T00:00:00.000Z',
            '2026-02-01T00:00:00.000Z',
        );
    });

    test('verifies the header token against DIAGNOSTICS_TOKEN', async () => {
        vi.stubEnv('DIAGNOSTICS_TOKEN', 'header-token');
        const ctx = makeCtx();
        ctx.request.headers = {'x-m10z-diagnostics-token': 'header-token'};

        await createController().metrics(ctx);

        expect(mocks.verifySecret).toHaveBeenCalledWith('header-token', 'header-token');
    });

    test('never passes a query-string token to verification', async () => {
        vi.stubEnv('DIAGNOSTICS_TOKEN', 'header-token');
        // The header check fails, so a header-then-query fallback would be reached
        // and would accept the valid token in the query string.
        mocks.verifySecret.mockReturnValueOnce(false);
        const ctx = makeCtx({token: 'header-token'});
        ctx.request.headers = {};

        await createController().metrics(ctx);

        expect(ctx.status).toBe(401);
        expect(mocks.verifySecret).toHaveBeenCalledTimes(1);
        expect(mocks.verifySecret).toHaveBeenCalledWith(undefined, 'header-token');
    });

    test('rejects an unauthenticated request before reading metrics', async () => {
        mocks.verifySecret.mockReturnValueOnce(false);
        const controller = createController();
        const ctx = makeCtx();

        await controller.metrics(ctx);

        expect(ctx.status).toBe(401);
        expect(mocks.getHistoricalSearchIndexMetrics).not.toHaveBeenCalled();
    });
});
