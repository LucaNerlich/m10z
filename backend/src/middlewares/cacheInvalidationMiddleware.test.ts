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
 * for every call.
 */
function makeStrapi(entity: Record<string, unknown> | null = null) {
    const strapi = {
        documents: vi.fn(() => ({findOne: vi.fn(async () => entity)})),
        log: {info: vi.fn(), warn: vi.fn(), error: vi.fn()},
    };
    return {strapi};
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

    test('create with status published queues a publish event', async () => {
        const {strapi} = makeStrapi({slug: 'my-article'});
        const next = vi.fn(async () => ({slug: 'my-article'}));

        await cacheInvalidationMiddleware(
            {
                uid: 'api::article.article',
                action: 'create',
                params: {strapi: strapi as any, status: 'published'},
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

    test('plain create stays silent', async () => {
        const {strapi} = makeStrapi({slug: 'my-article'});
        const next = vi.fn(async () => ({slug: 'my-article'}));

        await cacheInvalidationMiddleware(
            {uid: 'api::article.article', action: 'create', params: {strapi: strapi as any, documentId: 'doc-1'}},
            next,
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(mockedQueue).not.toHaveBeenCalled();
        expect(mockedRebuildQueue).not.toHaveBeenCalled();
    });

    test('create of a non draft&publish type with REST-injected status published still invalidates', async () => {
        const {strapi} = makeStrapi({slug: 'someone'});
        const next = vi.fn(async () => ({slug: 'someone'}));

        await cacheInvalidationMiddleware(
            {uid: 'api::author.author', action: 'create', params: {strapi: strapi as any, status: 'published'}},
            next,
        );

        expect(mockedQueue).toHaveBeenCalledTimes(1);
        expect(mockedQueue).toHaveBeenCalledWith(
            {type: 'author', action: 'create', slug: 'someone'},
            strapi,
        );
    });

    test('update of a non draft&publish type with REST-injected status published still invalidates', async () => {
        const {strapi} = makeStrapi({slug: 'someone'});
        const next = vi.fn(async () => ({}));

        await cacheInvalidationMiddleware(
            {
                uid: 'api::author.author',
                action: 'update',
                params: {strapi: strapi as any, documentId: 'doc-1', status: 'published'},
            },
            next,
        );

        expect(mockedQueue).toHaveBeenCalledTimes(1);
        expect(mockedQueue).toHaveBeenCalledWith(
            {type: 'author', action: 'update', slug: 'someone'},
            strapi,
        );
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

    test('delete resolves slugs before next() and queues one delete event', async () => {
        const order: string[] = [];
        const findOne = vi.fn(async () => {
            order.push('resolve');
            return {slug: 'cat-a'};
        });
        const strapi = {
            documents: vi.fn(() => ({findOne})),
            log: {info: vi.fn(), warn: vi.fn(), error: vi.fn()},
        };
        const next = vi.fn(async () => {
            order.push('next');
            return {};
        });

        await cacheInvalidationMiddleware(
            {uid: 'api::category.category', action: 'delete', params: {strapi: strapi as any, documentId: 'doc-1'}},
            next,
        );

        // The entity is gone once next() resolves — the slug must be resolved first,
        // otherwise every delete event would degrade to a slug-less bust.
        expect(order).toEqual(['resolve', 'next']);
        expect(mockedQueue).toHaveBeenCalledTimes(1);
        expect(mockedQueue).toHaveBeenCalledWith(
            {type: 'category', action: 'delete', slug: 'cat-a'},
            strapi,
        );
        expect(mockedRebuildQueue).toHaveBeenCalledTimes(1);
    });

    test('delete without a resolvable document fails open with a slug-less event', async () => {
        const {strapi} = makeStrapi();
        const next = vi.fn(async () => ({}));

        await cacheInvalidationMiddleware(
            {uid: 'api::category.category', action: 'delete', params: {strapi: strapi as any}},
            next,
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(mockedQueue).toHaveBeenCalledTimes(1);
        expect(mockedQueue).toHaveBeenCalledWith({type: 'category', action: 'delete'}, strapi);
    });

    test('a single-type update queues a slugless event without resolving a slug', async () => {
        const {strapi} = makeStrapi({slug: 'must-not-be-read'});
        const next = vi.fn(async () => ({}));

        await cacheInvalidationMiddleware(
            {
                uid: 'api::imprint.imprint',
                action: 'update',
                params: {strapi: strapi as any, documentId: 'imprint-1'},
            },
            next,
        );

        expect(mockedQueue).toHaveBeenCalledWith({type: 'imprint', action: 'update'}, strapi);
        expect(strapi.documents).not.toHaveBeenCalled();
    });

    test('creating or deleting a single type invalidates its pages', async () => {
        const {strapi} = makeStrapi();
        const next = vi.fn(async () => ({}));

        await cacheInvalidationMiddleware(
            {uid: 'api::privacy.privacy', action: 'create', params: {strapi: strapi as any}},
            next,
        );
        await cacheInvalidationMiddleware(
            {uid: 'api::privacy.privacy', action: 'delete', params: {strapi: strapi as any}},
            next,
        );

        expect(mockedQueue).toHaveBeenNthCalledWith(1, {type: 'privacy', action: 'create'}, strapi);
        expect(mockedQueue).toHaveBeenNthCalledWith(2, {type: 'privacy', action: 'delete'}, strapi);
    });

    test('cloning an author invalidates the cloned document, not the source', async () => {
        const findOne = vi.fn(async ({documentId}: {documentId?: string}) => ({
            slug: documentId === 'cloned-doc' ? 'cloned-author' : 'source-author',
        }));
        const strapi = {
            documents: vi.fn(() => ({findOne})),
            log: {info: vi.fn(), warn: vi.fn(), error: vi.fn()},
        };
        const next = vi.fn(async () => ({
            documentId: 'cloned-doc',
            entries: [{documentId: 'cloned-doc'}],
        }));

        await cacheInvalidationMiddleware(
            {uid: 'api::author.author', action: 'clone', params: {strapi: strapi as any, documentId: 'source-doc'}},
            next,
        );

        expect(findOne).toHaveBeenCalledWith(expect.objectContaining({documentId: 'cloned-doc'}));
        expect(mockedQueue).toHaveBeenCalledWith(
            {type: 'author', action: 'create', slug: 'cloned-author'},
            strapi,
        );
    });
});
