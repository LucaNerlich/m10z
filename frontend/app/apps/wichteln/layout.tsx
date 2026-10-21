import {type Metadata} from 'next';
import React from 'react';

import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {routes} from '@/src/lib/routes';

// The page is a client component, so its segment needs a layout to export metadata.
export const metadata: Metadata = buildStaticListMetadata({
    title: 'Wichteln',
    description:
        'Organisiere deine Wichtelrunde: Teilnehmer verwalten, zufällig zuordnen und Ergebnisse als Markdown exportieren.',
    path: routes.wichteln,
    ogImageAlt: 'Wichteln bei M10Z',
});

export default function WichtelnLayout({children}: {children: React.ReactNode}) {
    return children;
}
