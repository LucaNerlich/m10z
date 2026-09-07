import {describe, expect, test, vi} from 'vitest';

import statsControllerFactory from './stats';

type Ctx = {body?: unknown; status?: number};

function setup(getDashboard: () => Promise<unknown>) {
    const log = {debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn()};
    const service = {getDashboard};
    const strapi = {
        log,
        plugin: vi.fn((name: string) => {
            expect(name).toBe('umami-stats');
            return {service: vi.fn((serviceName: string) => {
                expect(serviceName).toBe('umami');
                return service;
            })};
        }),
    };
    const controller = statsControllerFactory({strapi});
    const ctx: Ctx = {};
    return {controller, ctx, log};
}

describe('stats controller', () => {
    test('returns the dashboard payload without touching the status', async () => {
        const payload = {ranges: {}, topSlugs: {}, cachedAt: '2026-09-07T12:00:00.000Z'};
        const {controller, ctx} = setup(async () => payload);

        await controller.getStats(ctx);

        expect(ctx.body).toBe(payload);
        expect(ctx.status).toBeUndefined();
    });

    test('maps config errors to 503', async () => {
        const {controller, ctx, log} = setup(async () => {
            const error = new Error('not configured');
            (error as {code?: string; status?: number}).code = 'UMAMI_CONFIG';
            (error as {code?: string; status?: number}).status = 503;
            throw error;
        });

        await controller.getStats(ctx);

        expect(ctx.status).toBe(503);
        expect(ctx.body).toMatchObject({error: {code: 'UMAMI_CONFIG'}});
        expect(log.error).toHaveBeenCalledOnce();
    });

    test('maps upstream errors to 502', async () => {
        const {controller, ctx} = setup(async () => {
            const error = new Error('unreachable');
            (error as {code?: string; status?: number}).code = 'UMAMI_UPSTREAM';
            (error as {code?: string; status?: number}).status = 502;
            throw error;
        });

        await controller.getStats(ctx);

        expect(ctx.status).toBe(502);
        expect(ctx.body).toMatchObject({error: {code: 'UMAMI_UPSTREAM'}});
    });

    test('maps unknown failures to 500 without leaking details', async () => {
        const secret = 'hunter2';
        const {controller, ctx, log} = setup(async () => {
            throw new Error(`db password=${secret} exploded`);
        });

        await controller.getStats(ctx);

        expect(ctx.status).toBe(500);
        expect(ctx.body).toMatchObject({error: {code: 'UMAMI_ERROR'}});
        expect(JSON.stringify(ctx.body)).not.toContain(secret);
        expect(log.error).toHaveBeenCalledWith('[umami-stats] Failed to load dashboard (code=UMAMI_ERROR, status=500).');
        expect(JSON.stringify(log.error.mock.calls)).not.toContain(secret);
    });
});
