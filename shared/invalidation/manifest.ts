/**
 * Single source of truth for the cache-invalidation contract between Strapi and Next.js.
 *
 * Both workspaces import from here. Frontend maps targets → tags/pages/paths;
 * backend maps UIDs → targets → POST /api/{target}/invalidate.
 */

export const INVALIDATION_TARGETS = [
    'about',
    'article',
    'articlefeed',
    'audiofeed',
    'author',
    'category',
    'legal',
    'podcast',
    'search-index',
    'sitemap',
] as const;

export type InvalidationTargetName = (typeof INVALIDATION_TARGETS)[number];

export type StrapiDocumentAction = 'publish' | 'update';

export type StrapiLifecycleEvent = 'afterCreate' | 'afterUpdate' | 'afterDelete';

/** Document-service middleware: UID → targets on specific publish/update actions. */
export const DOCUMENT_INVALIDATION: Record<
    string,
    {actions: readonly StrapiDocumentAction[]; targets: readonly InvalidationTargetName[]}
> = {
    'api::article.article': {actions: ['publish'], targets: ['articlefeed']},
    'api::podcast.podcast': {actions: ['publish'], targets: ['audiofeed']},
    'api::article-feed.article-feed': {actions: ['update'], targets: ['articlefeed']},
    'api::audio-feed.audio-feed': {actions: ['update'], targets: ['audiofeed']},
    'api::about.about': {actions: ['update'], targets: ['about']},
};

/** Lifecycle hooks: UID → targets per afterCreate/afterUpdate/afterDelete. */
export const LIFECYCLE_INVALIDATION: Record<
    string,
    Partial<Record<StrapiLifecycleEvent, readonly InvalidationTargetName[]>>
> = {
    'api::article.article': {
        afterCreate: ['article', 'sitemap'],
        afterUpdate: ['article', 'sitemap'],
        afterDelete: ['article', 'sitemap'],
    },
    'api::podcast.podcast': {
        afterCreate: ['podcast', 'sitemap'],
        afterUpdate: ['podcast', 'sitemap'],
        afterDelete: ['podcast', 'sitemap'],
    },
    'api::category.category': {
        afterCreate: ['category'],
        afterUpdate: ['category'],
        afterDelete: ['category'],
    },
    'api::author.author': {
        afterCreate: ['author'],
        afterUpdate: ['author'],
        afterDelete: ['author'],
    },
    'api::imprint.imprint': {
        afterUpdate: ['legal'],
    },
    'api::privacy.privacy': {
        afterUpdate: ['legal'],
    },
};

/** UIDs whose mutations should queue a debounced search-index rebuild. */
export const SEARCH_INDEX_REBUILD_UIDS = new Set<string>([
    'api::article.article',
    'api::podcast.podcast',
    'api::author.author',
    'api::category.category',
]);

export function isInvalidationTargetName(value: string): value is InvalidationTargetName {
    return (INVALIDATION_TARGETS as readonly string[]).includes(value);
}
