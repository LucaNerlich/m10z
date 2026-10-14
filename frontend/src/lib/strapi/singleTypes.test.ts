import {beforeEach, describe, expect, test, vi} from 'vitest';

const {fetchStrapiSingle} = vi.hoisted(() => ({fetchStrapiSingle: vi.fn()}));

vi.mock('@/src/lib/strapi/contentAccess', () => ({fetchStrapiSingle}));

import {routes} from '@/src/lib/routes';
import {getAbout, getFeedsInfo} from './singleTypes';

describe('outage fallbacks', () => {
    beforeEach(() => {
        fetchStrapiSingle.mockReset();
        // The whole point of a fallback: Strapi is unreachable.
        fetchStrapiSingle.mockRejectedValue(new Error('ECONNREFUSED'));
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    test('getFeedsInfo renders absolute feed URLs from the shared site URL, not `undefined/…`', async () => {
        const info = await getFeedsInfo();

        expect(info.content).toContain(`${routes.siteUrl}/rss.xml`);
        expect(info.content).toContain(`${routes.siteUrl}/audiofeed.xml`);
        expect(info.content).not.toContain('undefined/');
    });

    test('getAbout describes the publication instead of repeating the feeds copy', async () => {
        const about = await getAbout();

        // The About fallback used to be a copy of the feeds fallback, so during an
        // outage /ueber-uns explained how to subscribe to RSS.
        expect(about.content).not.toContain('RSS-Reader');
        expect(about.content).not.toContain('Artikel-Feed');
        expect(about.content).toContain('Magazin');
    });
});
