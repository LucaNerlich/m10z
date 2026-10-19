import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, test, vi} from 'vitest';

vi.mock('@/src/components/Header', () => ({default: () => null}));
vi.mock('@/src/components/Footer', () => ({default: () => null}));
vi.mock('@/src/components/UmamiAnalytics', () => ({default: () => null}));
vi.mock('@/src/components/ScrollRestoration', () => ({ScrollRestoration: () => null}));
vi.mock('@/src/components/ContentLayout', () => ({
    ContentLayout: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));
vi.mock('@/src/styles/fonts', () => ({
    argon: {variable: 'font-argon'},
    krypton: {variable: 'font-krypton'},
    neon: {variable: 'font-neon'},
    poppins: {variable: 'font-poppins'},
    radon: {variable: 'font-radon'},
    xenon: {variable: 'font-xenon'},
}));
vi.mock('next/script', () => ({
    default: ({id, src}: {id?: string; src?: string}) => <script id={id} src={src} />,
}));

import RootLayout from './layout';

describe('root layout JSON-LD', () => {
    test('server-renders both site-wide schemas as native JSON-LD scripts', () => {
        const html = renderToStaticMarkup(
            <RootLayout>
                <div>content</div>
            </RootLayout>,
        );

        expect(html).toContain('id="jsonld-organization"');
        expect(html).toContain('id="jsonld-website"');
        const scripts = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>/g) ?? [];
        expect(scripts).toHaveLength(2);
        expect(html).toContain('jsonld-organization');
        expect(html).toContain('jsonld-website');
    });
});
