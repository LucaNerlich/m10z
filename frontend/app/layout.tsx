import '../src/styles/global.css';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import UmamiAnalytics from '@/src/components/UmamiAnalytics';
import {ContentLayout} from '@/app/ContentLayout';
import {generateOrganizationJsonLd} from '@/src/lib/jsonld/organization';
import {generateWebsiteJsonLd} from '@/src/lib/jsonld/website';
import React from 'react';

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
        <html lang="de">
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
