import {describe, expect, test, vi} from 'vitest';

// Strapi-free route-config check: createCoreRouter returns the config object, so
// the default export is the object whose `find`/`findOne` entries carry policies.
vi.mock('@strapi/strapi', () => ({
    factories: {
        createCoreRouter: vi.fn((_uid: string, config: unknown) => config),
    },
}));

import authorRouter from './author/routes/author';
import categoryRouter from './category/routes/category';

type GuardedRoute = {config: {find: {policies: string[]}; findOne: {policies: string[]}}};

const EXPECTED = ['global::published-status-only'];

describe('draft-status route wiring', () => {
    for (const [name, router] of [
        ['author', authorRouter],
        ['category', categoryRouter],
    ] as const) {
        test(`${name} pins find/findOne to published`, () => {
            const config = router as unknown as GuardedRoute;
            expect(config.config.find.policies).toEqual(EXPECTED);
            expect(config.config.findOne.policies).toEqual(EXPECTED);
        });
    }
});
