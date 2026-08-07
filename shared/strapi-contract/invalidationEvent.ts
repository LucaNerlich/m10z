import type {ContentTypeKey, DocumentAction} from './registry';

/**
 * Entity-level invalidation payload sent from Strapi to the frontend's
 * `POST /api/invalidate` endpoint. Replaces the old bare `POST /api/{target}/invalidate`,
 * which carried no information about which entity changed.
 */
export type InvalidationEvent = {
    type: ContentTypeKey;
    action: DocumentAction;
    /** Slug of the mutated entity. Absent for single types, which have no slug. */
    slug?: string;
    /** Slugs of related entities (e.g. an article's authors/categories), keyed by relation field. */
    relations?: Partial<Record<string, readonly string[]>>;
};

export function isDocumentAction(value: string): value is DocumentAction {
    return value === 'create' || value === 'update' || value === 'delete' || value === 'publish' || value === 'unpublish';
}
