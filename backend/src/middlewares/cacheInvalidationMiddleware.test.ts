import {beforeEach, describe, expect, test, vi} from 'vitest';

vi.mock('../services/cacheInvalidationQueue', () => ({
    queueCacheInvalidation: vi.fn(),
}));
vi.mock('../services/searchIndexQueue', () => ({
    queueSearchIndexRebuild: vi.fn(),
}));

import {cacheInvalidationMiddleware} from './cacheInvalidation';
import {queueCacheInvalidation} from '../services/cacheInvalidationQueue';
import {queueSearchIndexRebuild} from '../services/searchIndexQueue';

const mockedQueue = vi.mocked(queueCacheInvalidation);
const mockedRebuildQueue = vi.mocked(queueSearchIndexRebuild);

/**
 * Builds a strapi stub whose `documents(uid).findOne` returns the given entity
 * for every call, or per-documentId entities when `byDocumentId` is provided.
 */
function makeStrapi(
    entity: Record<string, unknown> | null = null,
    byDocumentId: Record<string, Record<string, unknown> | null> = {},
) {
    const findOne = vi.fn(async (params: {documentId?: string}) => {
        if (params?.documentId && params.documentId in byDocumentId) {
            return byDocumentId[params.documentId] ?? null;
        }
        return entity;
    });
    const strapi = {
        documents: vi.fn(() => ({findOne})),
        log: {info: vi.fn(), warn: vi.fn(), error: vi.fn()},
    };
    return {strapi, findOne};
}

beforeEach(() => {
    mockedQueue.mockClear();
    mockedRebuildQueue.mockClear();
});

describe('cacheInvalidationMiddleware', () => {
    test('a plain update of a draft&publish type produces no invalidation', async () => {
        const {strapi} = makeStrapi();
        const next = vi.fn(async () => ({slug: 'my-article'}));

        await cacheInvalidationMiddleware(
            {uid: 'api::article.article', action: 'update', params: {strapi: strapi as any, documentId: 'doc-1'}},
            next,
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(mockedQueue).not.toHaveBeenCalled();
        expect(mockedRebuildQueue).not.toHaveBeenCalled();
    });

    test('an update with status published is treated as a publish and invalidates', async () => {
        const {strapi} = makeStrapi({slug: 'my-article'});
        const next = vi.fn(async () => ({}));

        await cacheInvalidationMiddleware(
            {
                uid: 'api::article.article',
                action: 'update',
                params: {strapi: strapi as any, documentId: 'doc-1', status: 'published'},
            },
            next,
        );

        expect(mockedQueue).toHaveBeenCalledTimes(1);
        expect(mockedQueue).toHaveBeenCalledWith(
            {type: 'article', action: 'publish', slug: 'my-article'},
            strapi,
        );
        expect(mockedRebuildQueue).toHaveBeenCalledTimes(1);
    });

    test('plain updates of types that invalidate on update still work', async () => {
        const {strapi} = makeStrapi({slug: 'someone'});
        const next = vi.fn(async () => ({}));

        await cacheInvalidationMiddleware(
            {
                uid: 'api::author.author',
                action: 'update',
                params: {strapi: strapi as any, documentId: 'doc-1'},
            },
            next,
        );

        expect(mockedQueue).toHaveBeenCalledWith(
            {type: 'author', action: 'update', slug: 'someone'},
            strapi,
        );
    });

    test('deleteMany on categories queues one delete event per resolved slug', async () => {
        const {strapi} = makeStrapi(null, {
            'doc-1': {slug: 'cat-a'},
            'doc-2': {slug: 'cat-b'},
        });
        const next = vi.fn(async () => ({}));

        await cacheInvalidationMiddleware(
            {
                uid: 'api::category.category',
                action: 'deleteMany',
                params: {strapi: strapi as any, documentIds: ['doc-1', 'doc-2']},
            },
            next,
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(mockedQueue).toHaveBeenCalledTimes(2);
        expect(mockedQueue).toHaveBeenNthCalledWith(
            1,
            {type: 'category', action: 'delete', slug: 'cat-a'},
            strapi,
        );
        expect(mockedQueue).toHaveBeenNthCalledWith(
            2,
            {type: 'category', action: 'delete', slug: 'cat-b'},
            strapi,
        );
        // Category invalidates on delete and rebuilds the search index.
        expect(mockedRebuildQueue).toHaveBeenCalledTimes(1);
    });

    test('deleteMany resolves slugs before the documents are deleted', async () => {
        const order: string[] = [];
        const {strapi} = makeStrapi({slug: 'cat-a'});
        strapi.documents = vi.fn(() => ({
            findOne: vi.fn(async () => {
                order.push('resolve');
                return {slug: 'cat-a'};
            }),
        })) as any;
        const next = vi.fn(async () => {
            order.push('next');
            return {};
        });

        await cacheInvalidationMiddleware(
            {
                uid: 'api::category.category',
                action: 'deleteMany',
                params: {strapi: strapi as any, documentIds: ['doc-1']},
            },
            next,
        );

        expect(order).toEqual(['resolve', 'next']);
    });

    test('deleteMany on articles queues delete events with relations and one search-index rebuild', async () => {
        const {strapi} = makeStrapi(null, {
            'doc-1': {slug: 'article-a', categories: [{slug: 'retro'}]},
            'doc-2': {slug: 'article-b', categories: [{slug: 'retro'}]},
        });
        const next = vi.fn(async () => ({}));

        await cacheInvalidationMiddleware(
            {
                uid: 'api::article.article',
                action: 'deleteMany',
                params: {strapi: strapi as any, documentIds: ['doc-1', 'doc-2']},
            },
            next,
        );

        expect(mockedQueue).toHaveBeenCalledTimes(2);
        expect(mockedQueue).toHaveBeenNthCalledWith(
            1,
            {type: 'article', action: 'delete', slug: 'article-a', relations: {categories: ['retro']}},
            strapi,
        );
        expect(mockedQueue).toHaveBeenNthCalledWith(
            2,
            {type: 'article', action: 'delete', slug: 'article-b', relations: {categories: ['retro']}},
            strapi,
        );
        expect(mockedRebuildQueue).toHaveBeenCalledTimes(1);
    });

    test('deleteMany with an unresolvable document still queues a slug-less delete event', async () => {
        const {strapi} = makeStrapi(null, {'doc-1': null});
        const next = vi.fn(async () => ({}));

        await cacheInvalidationMiddleware(
            {
                uid: 'api::category.category',
                action: 'deleteMany',
                params: {strapi: strapi as any, documentIds: ['doc-1']},
            },
            next,
        );

        expect(mockedQueue).toHaveBeenCalledWith({type: 'category', action: 'delete'}, strapi);
    });

    test('deleteMany without documentIds fails open with a single slug-less event', async () => {
        const {strapi} = makeStrapi();
        const next = vi.fn(async () => ({}));

        await cacheInvalidationMiddleware(
            {uid: 'api::category.category', action: 'deleteMany', params: {strapi: strapi as any}},
            next,
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(mockedQueue).toHaveBeenCalledTimes(1);
        expect(mockedQueue).toHaveBeenCalledWith({type: 'category', action: 'delete'}, strapi);
    });

    test('publishMany queues a publish event per document', async () => {
        const {strapi} = makeStrapi(null, {
            'doc-1': {slug: 'article-a'},
            'doc-2': {slug: 'article-b'},
        });
        const next = vi.fn(async () => ({}));

        await cacheInvalidationMiddleware(
            {
                uid: 'api::article.article',
                action: 'publishMany',
                params: {strapi: strapi as any, documentIds: ['doc-1', 'doc-2']},
            },
            next,
        );

        expect(mockedQueue).toHaveBeenCalledTimes(2);
        expect(mockedQueue).toHaveBeenNthCalledWith(
            1,
            {type: 'article', action: 'publish', slug: 'article-a'},
            strapi,
        );
        expect(mockedQueue).toHaveBeenNthCalledWith(
            2,
            {type: 'article', action: 'publish', slug: 'article-b'},
            strapi,
        );
    });

    test('unpublishMany queues a publish-affected unpublish event per document', async () => {
        const {strapi} = makeStrapi({slug: 'podcast-a'});
        const next = vi.fn(async () => ({}));

        await cacheInvalidationMiddleware(
            {
                uid: 'api::podcast.podcast',
                action: 'unpublishMany',
                params: {strapi: strapi as any, documentIds: ['doc-1']},
            },
            next,
        );

        expect(mockedQueue).toHaveBeenCalledWith({type: 'podcast', action: 'unpublish', slug: 'podcast-a'}, strapi);
        expect(mockedRebuildQueue).toHaveBeenCalledTimes(1);
    });

    test('bulk actions a type does not invalidate on are ignored', async () => {
        // Authors invalidate on create/update/delete, not on (un)publish.
        const {strapi} = makeStrapi({slug: 'someone'});
        const next = vi.fn(async () => ({}));

        await cacheInvalidationMiddleware(
            {
                uid: 'api::author.author',
                action: 'publishMany',
                params: {strapi: strapi as any, documentIds: ['doc-1']},
            },
            next,
        );

        expect(mockedQueue).not.toHaveBeenCalled();
        expect(mockedRebuildQueue).not.toHaveBeenCalled();
    });
});
