/**
 * Durable backing store for pending invalidation events.
 *
 * The in-memory `AsyncTaskQueue` loses its pending items on process restart/deploy.
 * For a single-instance deployment, a small table in the app's own Postgres DB is
 * enough to survive that without introducing a separate job system: events are
 * persisted on enqueue, removed on confirmed delivery, and drained back into the
 * queue on boot.
 */

import type {InvalidationEvent} from '../shared/contracts/strapi-contract/invalidationEvent';
import type {KnexSchemaBuilder, KnexTableBuilder, KnexTableRowQuery} from '../types/middleware';

const TABLE = 'pending_invalidations';

/** Bound how far back a boot-time drain looks, so a long-dead frontend can't grow this unboundedly. */
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DRAIN_BACKLOG = 500;

export type StrapiDb = {
    db: {
        connection: ((table: string) => KnexTableRowQuery) & {
            schema: KnexSchemaBuilder;
            fn: {now: () => unknown};
        };
    };
    log: {info: (message: string) => void; warn: (message: string, error?: unknown) => void};
};

let tableEnsured = false;
let ensureTablePromise: Promise<boolean> | null = null;

async function ensureTable(strapi: StrapiDb): Promise<boolean> {
    if (tableEnsured) return true;
    if (ensureTablePromise) return ensureTablePromise;

    ensureTablePromise = (async () => {
        try {
            const exists = await strapi.db.connection.schema.hasTable(TABLE);
            if (!exists) {
                await strapi.db.connection.schema.createTable(TABLE, (table) => {
                    table.increments('id').primary();
                    table.text('payload').notNullable();
                    table.timestamp('created_at').defaultTo(strapi.db.connection.fn.now());
                });
            }
            tableEnsured = true;
            return true;
        } catch (error) {
            strapi.log.warn('[pendingInvalidationStore] Failed to ensure table exists; falling back to in-memory only.', error);
            return false;
        } finally {
            // Clears on both success and failure — harmless on success since `tableEnsured`
            // already short-circuits future calls before this is ever consulted again.
            ensureTablePromise = null;
        }
    })();

    return ensureTablePromise;
}

export async function persistPending(strapi: StrapiDb, event: InvalidationEvent): Promise<number | null> {
    if (!(await ensureTable(strapi))) return null;
    try {
        const rows = await strapi.db.connection(TABLE).insert({payload: JSON.stringify(event)}).returning('id');
        const first = rows[0];
        return typeof first === 'number' ? first : (first?.id ?? null);
    } catch (error) {
        strapi.log.warn('[pendingInvalidationStore] Failed to persist pending event.', error);
        return null;
    }
}

export async function removePending(strapi: StrapiDb, id: number | null): Promise<void> {
    if (id === null || id === undefined) return;
    try {
        await strapi.db.connection(TABLE).where({id}).delete();
    } catch (error) {
        strapi.log.warn('[pendingInvalidationStore] Failed to remove delivered event.', error);
    }
}

export async function drainPending(strapi: StrapiDb): Promise<Array<{id: number; event: InvalidationEvent}>> {
    if (!(await ensureTable(strapi))) return [];
    try {
        const cutoff = new Date(Date.now() - RETENTION_MS);
        const rows = await strapi.db
            .connection(TABLE)
            .where('created_at', '>=', cutoff)
            .orderBy('created_at', 'asc')
            .limit(MAX_DRAIN_BACKLOG)
            .select('id', 'payload');

        // Rows older than the retention window are never drained — delete them so a
        // long-dead frontend cannot grow the table without bound.
        await pruneExpired(strapi, cutoff);

        return rows.flatMap((row) => {
            const id = typeof row.id === 'number' ? row.id : null;
            const payload = typeof row.payload === 'string' ? row.payload : null;
            if (id === null || payload === null) return [];
            try {
                return [{id, event: JSON.parse(payload) as InvalidationEvent}];
            } catch {
                return [];
            }
        });
    } catch (error) {
        strapi.log.warn('[pendingInvalidationStore] Failed to drain pending events.', error);
        return [];
    }
}

/**
 * Delete rows whose `created_at` is before the given cutoff (best effort).
 */
async function pruneExpired(strapi: StrapiDb, cutoff: Date): Promise<void> {
    try {
        await strapi.db.connection(TABLE).where('created_at', '<', cutoff).delete();
    } catch (error) {
        strapi.log.warn('[pendingInvalidationStore] Failed to prune expired pending events.', error);
    }
}
