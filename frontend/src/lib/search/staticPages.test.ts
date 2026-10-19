import {describe, expect, test} from 'vitest';

import {routes} from '@/src/lib/routes';

import {getStaticPageRecords} from './staticPages';

/**
 * Guards the single source of truth for the static-page hrefs. If one of these
 * literals is hardcoded again it will drift from `routes.*` and this test fails
 * before the search index starts pointing at a dead URL.
 */
describe('getStaticPageRecords', () => {
    test('returns the six static pages with their routes.* href', () => {
        const hrefById = new Map(getStaticPageRecords().map((record) => [record.id, record.href]));

        expect([...hrefById.keys()].sort()).toEqual(
            ['page:datenschutz', 'page:feeds', 'page:impressum', 'page:m12g', 'page:statistik', 'page:ueber-uns'].sort(),
        );
        expect(hrefById.get('page:m12g')).toBe(routes.m12g);
        expect(hrefById.get('page:statistik')).toBe(routes.statistik);
        expect(hrefById.get('page:impressum')).toBe(routes.imprint);
        expect(hrefById.get('page:datenschutz')).toBe(routes.privacy);
        expect(hrefById.get('page:ueber-uns')).toBe(routes.about);
        expect(hrefById.get('page:feeds')).toBe(routes.feeds);
    });
});
