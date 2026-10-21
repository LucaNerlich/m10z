/**
 * Cache invalidation middleware for Strapi document operations.
 *
 * This is the *only* invalidation hook (previously there was also a parallel set of
 * per-content-type lifecycle hooks with subtly different action semantics — Strapi 5's
 * Document Service middleware already intercepts create/update/delete/publish/unpublish
 * for both collection and single types, so that second mechanism was redundant).
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

function extractDocumentId(context: DocumentServiceContext, result: unknown): string | undefined {
    return (
        context.params?.documentId ??
        context.params?.where?.documentId ??
        (result as {documentId?: string} | undefined)?.documentId
    );
}

/**
 * Strapi's admin duplicate flow dispatches `clone`; the returned document lives
 * under `entries`, while `params.documentId` names the source.
 */
function extractClonedDocumentId(result: unknown): string | undefined {
    const entries = (result as {entries?: Array<{documentId?: string}>} | undefined)?.entries;
    return entries?.[0]?.documentId;
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

    // A Document Service `update({status: 'published'})` publishes the live entry,
    // and `create({status: 'published'})` publishes through an internal call the
    // middleware never sees as `publish` (REST/direct API calls). REST also injects
    // `status: 'published'` into every core-service call — for types without
    // draft & publish that default is an artifact, not a publication fact — so the
    // remap only applies where 'publish' is a real action for the type.
    // `clone` (the admin duplicate flow) creates a live row for non-draft&publish
    // types, so it invalidates like a create.
    const publishable = match?.config.invalidatesOn.includes('publish') ?? false;
    const effectiveAction: string =
        context.action === 'clone'
            ? 'create'
            : publishable && (context.action === 'create' || context.action === 'update') && context.params?.status === 'published'
                ? 'publish'
                : context.action;

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

    // A single-document action names at most one document. When none can be
    // identified (e.g. an unexpected params shape), `undefined` still yields a
    // slug-less event so type/list tags and pages bust.
    let event: InvalidationEvent;
    let result: unknown;

    // For deletes, the document is gone once `next()` resolves — resolve slug/relations first.
    if (effectiveAction === 'delete') {
        const documentId = extractDocumentId(context, undefined);
        const entity =
            config.kind === 'single'
                ? null
                : await resolveEntity(strapiInstance, uid, documentId, config.relations);
        event = buildEvent(key, 'delete', entity, config);
        result = await next();
    } else {
        result = await next();

        let slug = ((result as {slug?: string} | undefined)?.slug) ?? undefined;
        let relations: InvalidationEvent['relations'];
        // Document Service actions like publish/unpublish don't necessarily return the
        // entity's scalar fields directly, so fall back to resolving it whenever the slug
        // is still missing — not just when relations happen to be configured — otherwise
        // publish/unpublish events could end up with no slug at all.
        // Single types have neither a `slug` field nor relations, so resolving one
        // always throws `Invalid key slug` and only produces a log warning. Queue
        // the slugless event directly.
        if (config.kind === 'collection' && (!slug || config.relations)) {
            const documentId =
                context.action === 'clone' ? extractClonedDocumentId(result) : extractDocumentId(context, result);
            const entity = await resolveEntity(strapiInstance, uid, documentId, config.relations);
            slug = slug ?? ((entity?.slug as string | undefined) ?? undefined);
            relations = extractRelationSlugs(entity, config.relations);
        }
        event = {
            type: key as InvalidationEvent['type'],
            action: effectiveAction as DocumentAction,
            ...(slug ? {slug} : {}),
            ...(relations ? {relations} : {}),
        };
    }

    queueCacheInvalidation(event, strapiInstance);

    if (config.searchIndex) {
        queueSearchIndexRebuild(strapiInstance);
    }

    return result;
}
