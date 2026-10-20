// @vitest-environment jsdom
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, test, vi} from 'vitest';

vi.mock('next/image', () => ({
    default: ({
        alt,
        placeholder,
        blurDataURL,
    }: {
        alt?: string;
        placeholder?: string;
        blurDataURL?: string;
    }) => (
        <img
            alt={alt}
            data-placeholder={placeholder ?? ''}
            data-blur={blurDataURL ?? ''}
        />
    ),
}));

// Keep the test focused on the image wiring; the lightbox imports CSS and a
// browser-only library that the component map never renders here.
vi.mock('@/src/components/markdown/FancyboxClient', () => ({
    FancyboxClient: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

import {MEDIA_INDEX_VERSION, type MediaIndexFile} from '@/src/lib/media/mediaIndex';

import {markdownComponents} from './Markdown';

const BLURHASH = 'data:image/png;base64,AAAA';

const INDEX: MediaIndexFile = {
    version: MEDIA_INDEX_VERSION,
    baseUrl: 'https://cms.m10z.de',
    generatedAt: '2026-01-01T00:00:00.000Z',
    entries: {
        'uploads/indexed.jpg': {blurhash: BLURHASH},
    },
};

function renderImage(src: string): string {
    const Img = markdownComponents(INDEX).img;
    expect(typeof Img).toBe('function');
    if (typeof Img !== 'function') throw new Error('expected an img component');
    return renderToStaticMarkup(<Img src={src} alt='cover' />);
}

describe('markdownComponents blurhash wiring', () => {
    test('passes the indexed blurhash to the rendered image', () => {
        const html = renderImage('https://cms.m10z.de/uploads/indexed.jpg');

        expect(html).toContain('data-placeholder="blur"');
        expect(html).toContain(`data-blur="${BLURHASH}"`);
    });

    test('renders without a placeholder for an image outside the index', () => {
        const html = renderImage('https://cms.m10z.de/uploads/unknown.jpg');

        expect(html).toContain('data-placeholder="empty"');
        expect(html).toContain('data-blur=""');
    });
});
