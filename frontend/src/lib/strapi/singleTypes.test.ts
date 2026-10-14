import {beforeEach, describe, expect, test, vi} from 'vitest';

const {fetchStrapiSingle} = vi.hoisted(() => ({fetchStrapiSingle: vi.fn()}));

vi.mock('@/src/lib/strapi/contentAccess', () => ({fetchStrapiSingle}));

import {routes} from '@/src/lib/routes';
import {getFeedsInfo} from './singleTypes';

describe('getFeedsInfo outage fallback', () => {
    beforeEach(() => {
        fetchStrapiSingle.mockReset();
        // The whole point of the fallback: Strapi is unreachable.
        fetchStrapiSingle.mockRejectedValue(new Error('ECONNREFUSED'));
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    test('renders absolute feed URLs from the shared site URL, not `undefined/…`', async () => {
        const info = await getFeedsInfo();

        expect(info.content).toContain(`${routes.siteUrl}/rss.xml`);
        expect(info.content).toContain(`${routes.siteUrl}/audiofeed.xml`);
        expect(info.content).not.toContain('undefined/');
    });
});
