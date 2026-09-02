/**
 * Cache invalidation middleware for Strapi document operations.
 *
 * This is the *only* invalidation hook (previously there was also a parallel set of
 * per-content-type lifecycle hooks with subtly different action semantics — Strapi 5's
 * Document Service middleware already intercepts create/update/delete/publish/unpublish
 * for both collection and single types, so that second mechanism was redundant).
 *
 * Bulk admin operations (Strapi 5 list view) run through the `deleteMany`,
 * `publishMany`, and `unpublishMany` Document Service actions. They are
 * normalized to their base action (`delete`/`publish`/`unpublish`) and produce
 * one standard invalidation event per deleted/affected document, so the event
 * contract towards the frontend stays unchanged.
 *
 * Driven entirely by the shared content-type registry (`shared/strapi-contract/registry.ts`):
 * adding a new content type or changing what it cascades to is a registry edit, not a
 * change to this file.
 */

import {contentTypeByUid, type ContentTypeConfig, type DocumentAction} from '../shared/contracts/strapi-contract/registry';
import type {InvalidationEvent} from '../shared/contracts/strapi-contract/invalidationEvent';

import {queueCacheInvalidation} from '../services/cacheInvalidationQueue';
import {queueSearchIndexRebuild} from '../services/searchIndexQueue';
import type {DocumentServiceContext, StrapiInstance} from '../types/middleware';

/** Admin list-view bulk actions, mapped to the base actions used in `invalidatesOn`. */
const BULK_ACTION_BASE: Record<string, DocumentAction> = {
    deleteMany: 'delete',
    publishMany: 'publish',
    unpublishMany: 'unpublish',
};

function extractDocumentId(context: DocumentServiceContext, result: unknown): string | undefined {
    return (
        context.params?.documentId ??
        context.params?.where?.documentId ??
        (result as {documentId?: string} | undefined)?.documentId
    );
}

/**
 * Document ids affected by a bulk Document Service action. Empty when the
 * context carries none (single-document actions use `extractDocumentId`).
 */
function extractDocumentIds(context: DocumentServiceContext): string[] {
    const raw = context.params?.documentIds;
    if (!Array.isArray(raw)) return [];
    return raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function buildPopulate(relations: ContentTypeConfig['relations']): Record<string, {fields: string[]}> | undefined {
    if (!relations) return undefined;
    const fields = Object.keys(relations);
    if (fields.length === 0) return undefined;
    return Object.fromEntries(fields.map((field) => [field, {fields: ['slug']}]));
}

function extractRelationSlugs(
    entity: Record<string, unknown> | null | undefined,
    relations: ContentTypeConfig['relations'],
): InvalidationEvent['relations'] {
    if (!entity || !relations) return undefined;
    const out: Record<string, string[]> = {};
    for (const field of Object.keys(relations)) {
        const value = entity[field];
        const items = Array.isArray(value) ? value : value ? [value] : [];
        const slugs = items.map((item) => (item as {slug?: string})?.slug).filter((slug): slug is string => Boolean(slug));
        if (slugs.length > 0) out[field] = slugs;
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

async function resolveEntity(
    strapiInstance: StrapiInstance,
    uid: string,
    documentId: string | undefined,
    relations: ContentTypeConfig['relations'],
): Promise<Record<string, unknown> | null> {
    if (!documentId) return null;
    try {
        return await strapiInstance.documents(uid).findOne({
            documentId,
            fields: ['slug'],
            populate: buildPopulate(relations),
        });
    } catch (error) {
        strapiInstance.log.warn(`[cacheInvalidation] Failed to resolve entity ${uid}/${documentId} for invalidation.`, error);
        return null;
    }
}

function buildEvent(
    key: string,
    action: DocumentAction,
    entity: Record<string, unknown> | null | undefined,
    config: ContentTypeConfig,
): InvalidationEvent {
    const slug = (entity?.slug as string | undefined) ?? undefined;
    const relations = extractRelationSlugs(entity, config.relations);
    return {
        type: key as InvalidationEvent['type'],
        action,
        ...(slug ? {slug} : {}),
        ...(relations ? {relations} : {}),
    };
}

export async function cacheInvalidationMiddleware(
    context: DocumentServiceContext,
    next: () => Promise<unknown>,
): Promise<unknown> {
    const uid = context.uid;
    if (!uid) {
        // No content type on the context — nothing to invalidate.
        return next();
    }
    const match = contentTypeByUid(uid);

    // Strapi admin bulk actions carry `documentIds` instead of `documentId`.
    // Normalize them to their base action so the registry's `invalidatesOn`
    // keeps working and the emitted events keep the single-action contract.
    const bulkBase = BULK_ACTION_BASE[context.action];

    // A Document Service `update({status: 'published'})` publishes the live entry
    // without going through the `publish` action (REST/direct API calls). Treat it
    // as a publish so caches and the search index are busted exactly like the
    // explicit publish path.
    const effectiveAction: string =
        context.action === 'update' && context.params?.status === 'published'
            ? 'publish'
            : (bulkBase ?? context.action);

    if (!match || !match.config.invalidatesOn.includes(effectiveAction as never)) {
        return next();
    }

    const strapiInstance = context.params?.strapi;
    if (!strapiInstance) {
        console.warn('[cacheInvalidation] Missing strapiInstance for cache invalidation', {
            action: context.action,
            uid: context.uid,
        });
        return next();
    }

    const {key, config} = match;

    const targets = bulkBase ? extractDocumentIds(context) : [extractDocumentId(context, undefined)];
    // Fail open: when no document can be identified (e.g. an unexpected params
    // shape), still emit one slug-less event so type/list tags and pages bust.
    const documentIds: (string | undefined)[] = targets.length > 0 ? targets : [undefined];

    const resolveAll = (ids: (string | undefined)[]) =>
        Promise.all(ids.map((documentId) => resolveEntity(strapiInstance, uid, documentId, config.relations)));

    // For deletes, the documents are gone once `next()` resolves — resolve slug/relations first.
    let events: InvalidationEvent[];
    let result: unknown;

    if (effectiveAction === 'delete') {
        const entities = await resolveAll(documentIds);
        events = entities.map((entity) => buildEvent(key, 'delete', entity, config));
        result = await next();
    } else {
        result = await next();

        if (bulkBase) {
            // Documents still exist after bulk publish/unpublish — resolve afterwards.
            const entities = await resolveAll(documentIds);
            events = entities.map((entity) => buildEvent(key, effectiveAction as DocumentAction, entity, config));
        } else {
            let slug = ((result as {slug?: string} | undefined)?.slug) ?? undefined;
            let relations: InvalidationEvent['relations'];
            // Document Service actions like publish/unpublish don't necessarily return the
            // entity's scalar fields directly, so fall back to resolving it whenever the slug
            // is still missing — not just when relations happen to be configured — otherwise
            // publish/unpublish events could end up with no slug at all.
            if (!slug || config.relations) {
                const documentId = extractDocumentId(context, result);
                const entity = await resolveEntity(strapiInstance, uid, documentId, config.relations);
                slug = slug ?? ((entity?.slug as string | undefined) ?? undefined);
                relations = extractRelationSlugs(entity, config.relations);
            }
            events = [
                {
                    type: key as InvalidationEvent['type'],
                    action: effectiveAction as DocumentAction,
                    ...(slug ? {slug} : {}),
                    ...(relations ? {relations} : {}),
                },
            ];
        }
    }

    for (const event of events) {
        queueCacheInvalidation(event, strapiInstance);
    }

    if (config.searchIndex) {
        queueSearchIndexRebuild(strapiInstance);
    }

    return result;
}
