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

import {contentTypeByUid, type ContentTypeConfig} from '../shared/contracts/strapi-contract/registry';
import type {InvalidationEvent} from '../shared/contracts/strapi-contract/invalidationEvent';

import {queueCacheInvalidation} from '../services/cacheInvalidationQueue';
import {queueSearchIndexRebuild} from '../services/searchIndexQueue';

type DocumentsInstance = {
    findOne: (params: {documentId: string; fields?: string[]; populate?: Record<string, {fields: string[]}>}) => Promise<any>;
};

type StrapiInstance = {
    documents: (uid: string) => DocumentsInstance;
    log: {info: (message: string) => void; warn: (message: string, error?: unknown) => void};
};

type MiddlewareContext = {
    uid: string;
    action: string;
    params?: {
        strapi?: StrapiInstance;
        documentId?: string;
        where?: {documentId?: string; id?: string};
        data?: Record<string, unknown>;
    };
};

function extractDocumentId(context: MiddlewareContext, result: unknown): string | undefined {
    return (
        context.params?.documentId ??
        context.params?.where?.documentId ??
        (result as {documentId?: string} | undefined)?.documentId
    );
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

export async function cacheInvalidationMiddleware(
    context: MiddlewareContext,
    next: () => Promise<unknown>,
): Promise<unknown> {
    const match = contentTypeByUid(context.uid);

    if (!match || !match.config.invalidatesOn.includes(context.action as never)) {
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

    // For deletes, the document is gone once `next()` resolves — resolve slug/relations first.
    let slug: string | undefined;
    let relations: InvalidationEvent['relations'];

    if (context.action === 'delete') {
        const documentId = extractDocumentId(context, undefined);
        const entity = await resolveEntity(strapiInstance, context.uid, documentId, config.relations);
        slug = (entity?.slug as string | undefined) ?? undefined;
        relations = extractRelationSlugs(entity, config.relations);
    }

    const result = await next();

    if (context.action !== 'delete') {
        slug = ((result as {slug?: string} | undefined)?.slug) ?? slug;
        if (config.relations) {
            const documentId = extractDocumentId(context, result);
            const entity = await resolveEntity(strapiInstance, context.uid, documentId, config.relations);
            relations = extractRelationSlugs(entity, config.relations);
        }
    }

    const event: InvalidationEvent = {
        type: key,
        action: context.action as InvalidationEvent['action'],
        ...(slug ? {slug} : {}),
        ...(relations ? {relations} : {}),
    };

    queueCacheInvalidation(event, strapiInstance);

    if (config.searchIndex) {
        queueSearchIndexRebuild(strapiInstance);
    }

    return result;
}
