/**
 * Single source of truth for the Strapi content-type ↔ cache-invalidation contract.
 *
 * Both workspaces import from here (synced via scripts/sync-shared-contracts.mjs).
 * Backend matches a Document Service mutation against `uid` to decide whether/what
 * to send; frontend matches the resulting event's `type` back to a registry entry
 * to compute which cache tags to bust. Replaces the old, independently-maintained
 * DOCUMENT_INVALIDATION / LIFECYCLE_INVALIDATION / SEARCH_INDEX_REBUILD_UIDS maps.
 */

import {
    ABOUT_PAGE_TAG,
    ABOUT_TAG,
    feedSourceTag,
    feedTag,
    HOME_PAGE_TAG,
    IMPRINT_TAG,
    LEGAL_TAG,
    listTag,
    PRIVACY_TAG,
    RELATED_CONTENT_TAG,
    SEARCH_INDEX_TAG,
    sitemapTag,
    typeTag,
} from './tags';

export const CONTENT_TYPE_KEYS = [
    'article',
    'podcast',
    'author',
    'category',
    'article-feed',
    'audio-feed',
    'about',
    'about-feed',
    'imprint',
    'privacy',
    // Synthetic (non-Strapi-backed) types: never matched against a mutation by `uid`,
    // only ever constructed programmatically (by the search-index rebuild queue) to
    // reuse the same tag-computation path for a couple of flat, cross-cutting caches.
    'search-index',
    'sitemap',
] as const;

export type ContentTypeKey = (typeof CONTENT_TYPE_KEYS)[number];

export type DocumentAction = 'create' | 'update' | 'delete' | 'publish' | 'unpublish';

export type ContentTypeConfig = {
    /** Strapi Document Service UID, e.g. "api::article.article". Absent for synthetic types. */
    uid?: string;
    kind: 'collection' | 'single';
    /**
     * Document Service actions that should produce an invalidation event for this type.
     * For draft & publish types (article, podcast) this is deliberately publish-oriented —
     * saving a draft doesn't change what's live, so it shouldn't bust the public cache.
     */
    invalidatesOn: readonly DocumentAction[];
    /** Relation fields whose related-entity slugs get resolved into the event payload for precise fan-out. */
    relations?: Partial<Record<string, ContentTypeKey>>;
    /** Flat cache tags always busted alongside the entity/type/list tags. */
    cascadeTags?: readonly string[];
    /** Whether a mutation of this type should also queue a search-index rebuild. */
    searchIndex?: boolean;
    /** Present only for content types exposed via /preview/{frontendSegment}/{slug}. */
    preview?: {frontendSegment: string};
};

export const CONTENT_TYPES: Record<ContentTypeKey, ContentTypeConfig> = {
    article: {
        uid: 'api::article.article',
        kind: 'collection',
        invalidatesOn: ['publish', 'unpublish', 'delete'],
        relations: {authors: 'author', categories: 'category'},
        cascadeTags: [
            RELATED_CONTENT_TAG,
            HOME_PAGE_TAG,
            feedTag('article'),
            feedSourceTag('article'),
            typeTag('category'),
            listTag('category'),
            sitemapTag('articles'),
        ],
        searchIndex: true,
        preview: {frontendSegment: 'artikel'},
    },
    podcast: {
        uid: 'api::podcast.podcast',
        kind: 'collection',
        invalidatesOn: ['publish', 'unpublish', 'delete'],
        relations: {authors: 'author', categories: 'category'},
        cascadeTags: [
            RELATED_CONTENT_TAG,
            HOME_PAGE_TAG,
            feedTag('audio'),
            feedSourceTag('audio'),
            typeTag('category'),
            listTag('category'),
            sitemapTag('podcasts'),
        ],
        searchIndex: true,
        preview: {frontendSegment: 'podcasts'},
    },
    author: {
        uid: 'api::author.author',
        kind: 'collection',
        invalidatesOn: ['create', 'update', 'delete'],
        cascadeTags: [typeTag('article'), listTag('article'), typeTag('podcast'), listTag('podcast'), sitemapTag('authors')],
        searchIndex: true,
    },
    category: {
        uid: 'api::category.category',
        kind: 'collection',
        invalidatesOn: ['create', 'update', 'delete'],
        cascadeTags: [typeTag('article'), listTag('article'), typeTag('podcast'), listTag('podcast'), sitemapTag('categories')],
        searchIndex: true,
    },
    'article-feed': {
        uid: 'api::article-feed.article-feed',
        kind: 'single',
        invalidatesOn: ['update'],
        cascadeTags: [feedTag('article'), feedSourceTag('article')],
    },
    'audio-feed': {
        uid: 'api::audio-feed.audio-feed',
        kind: 'single',
        invalidatesOn: ['update'],
        cascadeTags: [feedTag('audio'), feedSourceTag('audio')],
    },
    about: {
        uid: 'api::about.about',
        kind: 'single',
        invalidatesOn: ['update'],
        cascadeTags: [ABOUT_TAG, ABOUT_PAGE_TAG],
    },
    'about-feed': {
        uid: 'api::about-feed.about-feed',
        kind: 'single',
        invalidatesOn: ['update'],
        cascadeTags: [feedSourceTag('article')],
    },
    imprint: {
        uid: 'api::imprint.imprint',
        kind: 'single',
        invalidatesOn: ['update'],
        cascadeTags: [LEGAL_TAG, IMPRINT_TAG],
    },
    privacy: {
        uid: 'api::privacy.privacy',
        kind: 'single',
        invalidatesOn: ['update'],
        cascadeTags: [LEGAL_TAG, PRIVACY_TAG],
    },
    'search-index': {
        kind: 'single',
        invalidatesOn: [],
        cascadeTags: [SEARCH_INDEX_TAG],
    },
    sitemap: {
        kind: 'single',
        invalidatesOn: [],
        cascadeTags: [sitemapTag('articles'), sitemapTag('podcasts'), sitemapTag('authors'), sitemapTag('categories')],
    },
};

const CONTENT_TYPE_KEY_SET: ReadonlySet<string> = new Set(CONTENT_TYPE_KEYS);

export function isContentTypeKey(value: string): value is ContentTypeKey {
    return CONTENT_TYPE_KEY_SET.has(value);
}

export function contentTypeByUid(uid: string): {key: ContentTypeKey; config: ContentTypeConfig} | undefined {
    for (const key of CONTENT_TYPE_KEYS) {
        if (CONTENT_TYPES[key].uid === uid) return {key, config: CONTENT_TYPES[key]};
    }
    return undefined;
}
