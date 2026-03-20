/**
 * Copies BaseContent (`base` component) fields onto root attributes for article, podcast, and category.
 *
 * Intended to run inside a live Strapi process (bootstrap or cron) so config and DB match `strapi start`.
 * If the article schema has no `base` attribute, exits without changes (already flattened or fresh DB).
 */

type StrapiLike = {
    getModel: (uid: string) => {attributes?: Record<string, unknown>} | undefined;
    documents: (uid: string) => {
        findMany: (p: Record<string, unknown>) => Promise<unknown>;
        update: (p: Record<string, unknown>) => Promise<unknown>;
    };
    log: {info: (m: string) => void; warn: (m: string) => void; error: (m: string, ...a: unknown[]) => void};
};

/**
 * Strapi's relation validator rejects many `documentId`-based `connect` payloads for
 * `plugin::upload.file` (media). Use the numeric database `id` when present — see REST
 * relations docs ("connect is not officially supported for media" / use file IDs).
 */
function unwrapMediaRef(media: unknown): {id?: number; documentId?: string} | null {
    if (media == null || typeof media !== 'object') return null;
    const o = media as Record<string, unknown>;
    if (o.data != null && typeof o.data === 'object') {
        return unwrapMediaRef(o.data);
    }
    let id: number | undefined;
    const idRaw = o.id;
    if (typeof idRaw === 'number' && Number.isFinite(idRaw) && idRaw > 0) {
        id = idRaw;
    } else if (typeof idRaw === 'string' && /^\d+$/.test(idRaw)) {
        const n = parseInt(idRaw, 10);
        if (n > 0) id = n;
    }
    const documentId =
        typeof o.documentId === 'string' && o.documentId.length > 0 ? o.documentId : undefined;
    if (id === undefined && documentId === undefined) return null;
    return {id, documentId};
}

/** Prefer `{ connect: [numericId] }` for media; avoids ValidationError "Invalid relations". */
function mediaRelationPayload(media: unknown): {connect: (number | string)[]} | null {
    const ref = unwrapMediaRef(media);
    if (!ref) return null;
    if (ref.id !== undefined) {
        return {connect: [ref.id]};
    }
    if (ref.documentId) {
        return {connect: [ref.documentId]};
    }
    return null;
}

function getResults(res: unknown): Record<string, unknown>[] {
    if (!res) return [];
    if (Array.isArray(res)) return res as Record<string, unknown>[];
    const r = res as {results?: unknown[]; data?: unknown[]};
    if (Array.isArray(r.results)) return r.results as Record<string, unknown>[];
    if (Array.isArray(r.data)) return r.data as Record<string, unknown>[];
    return [];
}

function getPagination(res: unknown): {page: number; pageCount: number} {
    const r = res as {
        meta?: {pagination?: {page?: number; pageCount?: number}};
        pagination?: {page?: number; pageCount?: number};
    };
    const p = r.pagination ?? r.meta?.pagination;
    return {
        page: typeof p?.page === 'number' ? p.page : 1,
        pageCount: typeof p?.pageCount === 'number' ? p.pageCount : 1,
    };
}

async function fetchAllDocuments(
    strapi: StrapiLike,
    uid: string,
    baseParams: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
    const out: Record<string, unknown>[] = [];
    let page = 1;
    let pageCount = 1;
    do {
        const res = await strapi.documents(uid).findMany({
            ...baseParams,
            pagination: {page, pageSize: 50},
        });
        const batch = getResults(res);
        out.push(...batch);
        const pag = getPagination(res);
        pageCount = pag.pageCount;
        page += 1;
    } while (page <= pageCount);
    return out;
}

async function migrateType(
    strapi: StrapiLike,
    uid: string,
    options: {useDraftStatus: boolean},
): Promise<number> {
    const populate = {
        base: {
            populate: {
                // Request DB `id` — Document Service media `connect` validates numeric file ids, not only documentId.
                cover: {fields: ['id', 'documentId']},
                banner: {fields: ['id', 'documentId']},
            },
            fields: ['title', 'description', 'date'],
        },
    };

    const statuses = options.useDraftStatus ? (['draft', 'published'] as const) : ([undefined] as const);
    let updated = 0;

    for (const status of statuses) {
        const baseFind: Record<string, unknown> = {
            populate,
            fields: ['slug'],
        };
        if (status !== undefined) {
            baseFind.status = status;
        }

        const docs = await fetchAllDocuments(strapi, uid, baseFind);

        for (const doc of docs) {
            const documentId = doc.documentId;
            if (typeof documentId !== 'string' || documentId.length === 0) continue;

            const base = doc.base as Record<string, unknown> | null | undefined;
            if (!base || typeof base !== 'object') {
                strapi.log.warn(`[migrate-flatten-base] ${uid} documentId=${documentId} missing base, skip`);
                continue;
            }

            const title = base.title;
            if (typeof title !== 'string' || title.trim().length === 0) {
                strapi.log.warn(`[migrate-flatten-base] ${uid} documentId=${documentId} empty base.title, skip`);
                continue;
            }

            const data: Record<string, unknown> = {
                title,
                description: base.description ?? null,
                date: base.date ?? null,
            };
            const coverPayload = mediaRelationPayload(base.cover);
            if (coverPayload) data.cover = coverPayload;
            const bannerPayload = mediaRelationPayload(base.banner);
            if (bannerPayload) data.banner = bannerPayload;

            const updateParams: Record<string, unknown> = {
                documentId,
                data,
            };
            if (status !== undefined) {
                updateParams.status = status;
            }

            try {
                await strapi.documents(uid).update(updateParams);
            } catch (err) {
                const hasMedia = Boolean(coverPayload || bannerPayload);
                const msg = err instanceof Error ? err.message : String(err);
                if (hasMedia && msg.includes('Invalid relations')) {
                    strapi.log.warn(
                        `[migrate-flatten-base] ${uid} documentId=${documentId} media connect failed (${msg}); retrying title/description/date only`,
                    );
                    const dataScalarsOnly: Record<string, unknown> = {
                        title,
                        description: base.description ?? null,
                        date: base.date ?? null,
                    };
                    await strapi.documents(uid).update({
                        ...updateParams,
                        data: dataScalarsOnly,
                    });
                } else {
                    throw err;
                }
            }
            updated += 1;
        }
    }

    return updated;
}

/**
 * Run BaseContent → root field copy. Safe to call when `base` is already removed (no-op).
 */
export async function runMigrateFlattenBase(strapi: StrapiLike): Promise<void> {
    const articleModel = strapi.getModel('api::article.article');
    if (!articleModel?.attributes?.base) {
        strapi.log.info(
            '[migrate-flatten-base] No `base` on article schema — nothing to do (already flattened or fresh DB).',
        );
        return;
    }

    const a = await migrateType(strapi, 'api::article.article', {useDraftStatus: true});
    const p = await migrateType(strapi, 'api::podcast.podcast', {useDraftStatus: true});
    const c = await migrateType(strapi, 'api::category.category', {useDraftStatus: false});

    strapi.log.info(`[migrate-flatten-base] Done. articles=${a} podcasts=${p} categories=${c} (rows updated)`);
}

/**
 * Strapi cron task shape ({ strapi }).
 * Register only when `MIGRATE_FLATTEN_BASE_CRON_ENABLED=true` in server config (see config/server.ts).
 */
export async function migrateFlattenBaseCronJob({strapi}: {strapi: StrapiLike}): Promise<void> {
    try {
        await runMigrateFlattenBase(strapi);
    } catch (err) {
        strapi.log.error('[migrate-flatten-base] Cron job failed:', err);
    }
}
