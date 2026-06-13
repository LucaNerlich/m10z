import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

vi.mock('./asyncCacheInvalidationQueue', () => ({
    queueCacheInvalidation: vi.fn(),
}));

vi.mock('./asyncSearchIndexQueue', () => ({
    queueSearchIndexRebuild: vi.fn(),
}));

import {queueCacheInvalidation} from './asyncCacheInvalidationQueue';
import {queueSearchIndexRebuild} from './asyncSearchIndexQueue';
import {createContentInvalidationLifecycles} from './contentInvalidationLifecycles';

const fakeStrapi = {log: {info: vi.fn(), warn: vi.fn()}};

afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
});

describe('createContentInvalidationLifecycles', () => {
    test('returns an empty object for an unknown UID', () => {
        const handlers = createContentInvalidationLifecycles('api::unknown.unknown');
        expect(handlers).toEqual({});
    });

    test('returns handlers for every event defined in the manifest for api::article.article', () => {
        const handlers = createContentInvalidationLifecycles('api::article.article');
        const keys = Object.keys(handlers).sort();
        expect(keys).toEqual(['afterCreate', 'afterDelete', 'afterUpdate']);
    });

    test('invoking a handler calls queueCacheInvalidation', () => {
        vi.stubGlobal('strapi', fakeStrapi);
        const handlers = createContentInvalidationLifecycles('api::article.article');
        handlers['afterCreate']?.(undefined);
        expect(queueCacheInvalidation).toHaveBeenCalled();
    });

    test('invoking a handler also calls queueSearchIndexRebuild for search-index UIDs', () => {
        vi.stubGlobal('strapi', fakeStrapi);
        const handlers = createContentInvalidationLifecycles('api::article.article');
        handlers['afterCreate']?.(undefined);
        expect(queueSearchIndexRebuild).toHaveBeenCalled();
    });

    test('does not call queueSearchIndexRebuild for non-search-index UIDs', () => {
        // api::imprint.imprint is not in SEARCH_INDEX_REBUILD_UIDS
        vi.stubGlobal('strapi', fakeStrapi);
        const handlers = createContentInvalidationLifecycles('api::imprint.imprint');
        handlers['afterUpdate']?.(undefined);
        expect(queueCacheInvalidation).toHaveBeenCalled();
        expect(queueSearchIndexRebuild).not.toHaveBeenCalled();
    });

    test('invoking a handler passes null to queueCacheInvalidation when strapi global is absent', () => {
        // Do not stub strapi — it should be undefined in the test environment.
        const handlers = createContentInvalidationLifecycles('api::article.article');
        handlers['afterCreate']?.(undefined);
        expect(queueCacheInvalidation).toHaveBeenCalledWith(
            expect.any(String),
            null,
        );
    });
});
