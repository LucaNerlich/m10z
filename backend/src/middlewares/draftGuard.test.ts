import {describe, expect, test, vi} from 'vitest';

import draftGuard from './draftGuard';

function makeCtx(overrides: {
    path?: string;
    query?: Record<string, unknown>;
    state?: Record<string, unknown>;
} = {}) {
    return {
        path: overrides.path ?? '/api/articles',
        query: {...(overrides.query ?? {})},
        state: {...(overrides.state ?? {})},
    };
}

describe('draftGuard', () => {
    test('rewrites status=draft to published for unauthenticated content-API requests', async () => {
        const middleware = draftGuard();
        const ctx = makeCtx({query: {status: 'draft'}});
        const next = vi.fn().mockResolvedValue(undefined);

        await middleware(ctx, next);

        expect(ctx.query.status).toBe('published');
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('leaves status=draft untouched for authenticated requests (API token)', async () => {
        const middleware = draftGuard();
        const ctx = makeCtx({query: {status: 'draft'}, state: {auth: {credentials: {}}}});
        const next = vi.fn().mockResolvedValue(undefined);

        await middleware(ctx, next);

        expect(ctx.query.status).toBe('draft');
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('leaves status=published untouched', async () => {
        const middleware = draftGuard();
        const ctx = makeCtx({query: {status: 'published'}});
        const next = vi.fn().mockResolvedValue(undefined);

        await middleware(ctx, next);

        expect(ctx.query.status).toBe('published');
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('ignores requests without a status query param', async () => {
        const middleware = draftGuard();
        const ctx = makeCtx();
        const next = vi.fn().mockResolvedValue(undefined);

        await middleware(ctx, next);

        expect(ctx.query.status).toBeUndefined();
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('ignores non-content-API paths (e.g. admin panel)', async () => {
        const middleware = draftGuard();
        const ctx = makeCtx({path: '/admin/content-manager/collection-types/api::article.article', query: {status: 'draft'}});
        const next = vi.fn().mockResolvedValue(undefined);

        await middleware(ctx, next);

        expect(ctx.query.status).toBe('draft');
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('ignores array status values (cannot be a clean draft request)', async () => {
        const middleware = draftGuard();
        const ctx = makeCtx({query: {status: ['draft', 'draft']}});
        const next = vi.fn().mockResolvedValue(undefined);

        await middleware(ctx, next);

        expect(ctx.query.status).toEqual(['draft', 'draft']);
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('applies to graphql paths as well', async () => {
        const middleware = draftGuard();
        const ctx = makeCtx({path: '/graphql', query: {status: 'draft'}});
        const next = vi.fn().mockResolvedValue(undefined);

        await middleware(ctx, next);

        expect(ctx.query.status).toBe('published');
        expect(next).toHaveBeenCalledTimes(1);
    });
});
