import '../src/styles/global.css';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import UmamiAnalytics from '@/src/components/UmamiAnalytics';
import {ContentLayout} from '@/app/ContentLayout';
import {generateOrganizationJsonLd} from '@/src/lib/jsonld/organization';
import {generateWebsiteJsonLd} from '@/src/lib/jsonld/website';
import React from 'react';
import Head from 'next/head';

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    const orgJsonLd = generateOrganizationJsonLd();
    const websiteJsonLd = generateWebsiteJsonLd();

    return (
        <html lang="de">
        <Head>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: JSON.stringify(orgJsonLd)}}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: JSON.stringify(websiteJsonLd)}}
            />
        </Head>
        <body>
        <Header />
        <main>
            <ContentLayout>{children}</ContentLayout>
        </main>
        <Footer />
        <UmamiAnalytics />
        </body>
        </html>
    );
}
