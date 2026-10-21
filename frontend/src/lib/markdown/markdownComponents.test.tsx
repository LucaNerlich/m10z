import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach, describe, expect, test, vi} from 'vitest';

// Mock the client component so the props crossing the server/client boundary are
// visible: the real Image resolves its own src on the server, which would hide
// whether the wrapper resolved anything.
vi.mock('@/src/components/markdown/Image', () => ({
    Image: ({src, alt}: {src?: string; alt?: string}) => <img data-src={src} alt={alt} />,
}));

import {markdownComponents} from './Markdown';

function renderImage(src: string): string {
    const Img = markdownComponents(null).img;
    if (typeof Img !== 'function') throw new Error('expected an img component');
    return renderToStaticMarkup(<Img src={src} alt='cover' />);
}

describe('markdownComponents image src', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    test('resolves a relative Strapi path on the server', () => {
        // STRAPI_URL is server-only. Resolving inside the client Image made SSR and
        // hydration disagree; the wrapper must hand it an absolute URL.
        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de');

        expect(renderImage('/uploads/a.jpg')).toContain('data-src="https://cms.m10z.de/uploads/a.jpg"');
    });

    test('keeps an already absolute URL', () => {
        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de');

        expect(renderImage('https://cdn.example.test/a.jpg')).toContain('data-src="https://cdn.example.test/a.jpg"');
    });
});
