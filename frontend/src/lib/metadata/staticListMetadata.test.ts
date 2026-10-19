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
});
