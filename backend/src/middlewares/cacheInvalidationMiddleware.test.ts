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

function makeStrapi(entity: Record<string, unknown> | null = null) {
    const findOne = vi.fn(async () => entity);
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
});
