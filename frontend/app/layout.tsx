import '../src/styles/global.css';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import UmamiAnalytics from '@/src/components/UmamiAnalytics';
import {ScrollRestoration} from '@/src/components/ScrollRestoration';
import {ContentLayout} from '@/app/ContentLayout';
import {generateOrganizationJsonLd} from '@/src/lib/jsonld/organization';
import {generateWebsiteJsonLd} from '@/src/lib/jsonld/website';
import {stringifyJsonLd} from '@/src/lib/jsonld/helpers';
import {argon, krypton, neon, poppins, radon, xenon} from '@/src/styles/fonts';
import {type Metadata, type Viewport} from 'next';
import Script from 'next/script';
import {routes} from '@/src/lib/routes';
import React from 'react';

export const metadata: Metadata = {
    title: {
        template: '%s | Mindestens 10 Zeichen',
        default: 'Mindestens 10 Zeichen',
    },
    description: 'Ein offener Kanal für Videospielcontent und das Drumherum – unentgeltlich, unabhängig, ungezwungen.',
    robots: {
        index: true,
        follow: true,
    },
    openGraph: {
        type: 'website',
        locale: 'de',
        siteName: 'Mindestens 10 Zeichen',
        url: routes.siteUrl,
        title: 'Mindestens 10 Zeichen',
        description: 'Ein offener Kanal für Videospielcontent und das Drumherum – unentgeltlich, unabhängig, ungezwungen.',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Mindestens 10 Zeichen',
        description: 'Ein offener Kanal für Videospielcontent und das Drumherum – unentgeltlich, unabhängig, ungezwungen.',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor: '#ff6b35',
};

/**
 * Root layout component that provides the application's top-level HTML structure and embeds organization and website JSON-LD.
 *
 * Renders <html> with configured fonts and a <body> that includes ScrollRestoration, Header, a <main> containing ContentLayout wrapping `children`, Footer, UmamiAnalytics, and two `application/ld+json` scripts with organization and website JSON-LD.
 *
 * @param children - The page content to render inside ContentLayout
 * @returns The complete HTML element tree for the application, including embedded JSON-LD scripts
 */
export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    const orgJsonLd = generateOrganizationJsonLd();
    const websiteJsonLd = generateWebsiteJsonLd();

    return (
        <html
            lang="de"
            className={`${poppins.variable} ${argon.variable} ${krypton.variable} ${neon.variable} ${radon.variable} ${xenon.variable}`}
            suppressHydrationWarning
        >
        <body>
        <Script
            id="theme-init"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
                __html: `
(function() {
    try {
        var stored = localStorage.getItem('m10z-theme');
        var theme = stored && ['system', 'light', 'dark', 'grey'].includes(stored) ? stored : 'system';
        var effectiveTheme;
        
        if (theme === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
            effectiveTheme = theme;
        }
        
        document.documentElement.dataset.theme = effectiveTheme;
    } catch (e) {
        // Fallback to system preference if localStorage fails
        var effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.documentElement.dataset.theme = effectiveTheme;
    }
})();
                `.trim(),
            }}
        />
        <ScrollRestoration />
        <Header />
        <main>
            <ContentLayout>{children}</ContentLayout>
        </main>
        <Footer />
        <UmamiAnalytics />
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{__html: stringifyJsonLd(orgJsonLd)}}
        />
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{__html: stringifyJsonLd(websiteJsonLd)}}
        />
        </body>
        </html>
    );
}