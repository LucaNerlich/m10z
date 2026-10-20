import {describe, expect, test} from 'vitest';

import {buildStaticListMetadata} from './staticListMetadata';

describe('buildStaticListMetadata', () => {
    test('declares the real dimensions of the square share image', () => {
        const metadata = buildStaticListMetadata({
            title: 'Test',
            description: 'Description',
            path: '/test',
            ogImageAlt: 'Alt',
        });

        const images = metadata.openGraph?.images;
        const image = Array.isArray(images) ? images[0] : images;
        expect(image).toMatchObject({width: 3000, height: 3000});
    });

    test('keeps the layout feed alternates and twitter site on a page-level helper', () => {
        const metadata = buildStaticListMetadata({
            title: 'Test',
            description: 'Description',
            path: '/test',
            ogImageAlt: 'Alt',
        });

        // Next replaces nested metadata objects instead of merging them, so the
        // helper must repeat the layout's site-wide values.
        expect(metadata.alternates?.types?.['application/rss+xml']).toHaveLength(2);
        expect(metadata.twitter?.site).toBe('@m10z_tv');
    });
});
