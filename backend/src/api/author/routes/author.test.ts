import {describe, expect, test, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
    createCoreRouter: vi.fn((uid: string, options?: unknown) => ({uid, options})),
}));

vi.mock('@strapi/strapi', () => ({factories: {createCoreRouter: mocks.createCoreRouter}}));

// Importing the route module calls factories.createCoreRouter at load time.
import router from './author';

describe('author router', () => {
    test('pins find/findOne to the published-status-only policy', () => {
        // The author route populates the draft-and-publish `podcasts` relation,
        // so without this policy `?status=draft&populate=podcasts` leaks drafts.
        expect(mocks.createCoreRouter).toHaveBeenCalledWith('api::author.author', {
            config: {
                find: {policies: ['global::published-status-only']},
                findOne: {policies: ['global::published-status-only']},
            },
        });
        expect(router).toEqual({
            uid: 'api::author.author',
            options: {
                config: {
                    find: {policies: ['global::published-status-only']},
                    findOne: {policies: ['global::published-status-only']},
                },
            },
        });
    });
});
