import '../src/styles/global.css';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import UmamiAnalytics from '@/src/components/UmamiAnalytics';
import {ContentLayout} from '@/app/ContentLayout';
import {generateOrganizationJsonLd} from '@/src/lib/jsonld/organization';
import {generateWebsiteJsonLd} from '@/src/lib/jsonld/website';
import {argon, krypton, neon, poppins, radon, xenon} from '@/src/styles/fonts';
import {type Metadata, type Viewport} from 'next';
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
 * Root layout component that embeds organization and website JSON-LD into the document head and renders the page chrome.
 *
 * @param children - The page content to render inside the main content area.
 * @returns The top-level HTML structure including <head> with JSON-LD scripts, header, main content wrapped by ContentLayout, footer, and analytics.
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
        >
        <body>
        <Header />
        <main>
            <ContentLayout>{children}</ContentLayout>
        </main>
        <Footer />
        <UmamiAnalytics />
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{__html: JSON.stringify(orgJsonLd)}}
        />
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{__html: JSON.stringify(websiteJsonLd)}}
        />
        </body>
        </html>
    );
}
