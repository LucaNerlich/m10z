import {describe, expect, test} from 'vitest';

import {
    articleDetailPopulate,
    articleListPopulate,
    podcastDetailPopulate,
    podcastListPopulate,
} from './populate';

describe('author population', () => {
    test('list presets populate author attribution', () => {
        expect(articleListPopulate.authors).toBeDefined();
        expect(podcastListPopulate.authors).toBeDefined();
    });

    test('list presets use the name-only author shape, not avatars', () => {
        expect(articleListPopulate.authors).toEqual({fields: ['title', 'slug']});
        expect(podcastListPopulate.authors).toEqual({fields: ['title', 'slug']});
        expect(articleListPopulate.authors).not.toEqual(articleDetailPopulate.authors);
        expect(podcastListPopulate.authors).not.toEqual(podcastDetailPopulate.authors);
    });
});
