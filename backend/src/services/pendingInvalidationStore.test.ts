import {describe, expect, test, vi} from 'vitest';

import {drainPending, removePending} from './pendingInvalidationStore';

function makeFakeDb(rows: Array<{id: number; payload: string}>) {
    const deleteFn = vi.fn(() => Promise.resolve(1));
    const selectFn = vi.fn(() => Promise.resolve(rows));
    const chain: any = {
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        select: selectFn,
        delete: deleteFn,
    };
    const connection = vi.fn(() => chain) as any;
    connection.schema = {hasTable: vi.fn(() => Promise.resolve(true)), createTable: vi.fn()};
    connection.fn = {now: () => new Date()};

    const strapi = {
        db: {connection},
        log: {info: vi.fn(), warn: vi.fn()},
    };
    return {strapi, chain, deleteFn, selectFn};
}

describe('drainPending', () => {
    test('returns parsed rows and prunes rows older than the retention window', async () => {
        const {strapi, chain, deleteFn} = makeFakeDb([
            {id: 1, payload: JSON.stringify({type: 'article', action: 'publish', slug: 'a'})},
        ]);

        const result = await drainPending(strapi as any);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
        expect(result[0].event.slug).toBe('a');

        // Drain: where(created_at >= cutoff), ordered, limited to the backlog size.
        expect(chain.where).toHaveBeenCalledWith('created_at', '>=', expect.any(Date));
        expect(chain.orderBy).toHaveBeenCalledWith('created_at', 'asc');
        expect(chain.limit).toHaveBeenCalledWith(500);

        // Prune: rows older than the retention window are deleted.
        expect(chain.where).toHaveBeenCalledWith('created_at', '<', expect.any(Date));
        expect(deleteFn).toHaveBeenCalledTimes(1);
    });

    test('skips rows with malformed payloads', async () => {
        const {strapi} = makeFakeDb([
            {id: 1, payload: 'not-json'},
            {id: 2, payload: JSON.stringify({type: 'article', action: 'publish'})},
        ]);

        const result = await drainPending(strapi as any);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });

    test('returns an empty array when the table cannot be ensured', async () => {
        const {strapi} = makeFakeDb([]);
        strapi.db.connection.schema.hasTable = vi.fn(() => Promise.reject(new Error('no db')));

        const result = await drainPending(strapi as any);

        expect(result).toEqual([]);
    });
});

describe('removePending', () => {
    test('deletes the row by id', async () => {
        const {strapi, chain} = makeFakeDb([]);

        await removePending(strapi as any, 42);

        expect(chain.where).toHaveBeenCalledWith({id: 42});
    });

    test('is a no-op for null/undefined ids', async () => {
        const {strapi, chain} = makeFakeDb([]);

        await removePending(strapi as any, null);
        await removePending(strapi as any, undefined);

        expect(chain.where).not.toHaveBeenCalled();
    });
});
