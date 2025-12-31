import {Suspense} from 'react';
import {type Metadata} from 'next';

import {HomePage} from '@/src/components/HomePage';
import {FeedSkeleton} from '@/src/components/FeedSkeleton';
import {absoluteRoute} from '@/src/lib/routes';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';

export const metadata: Metadata = {
    description: 'Ein offener Kanal für Videospielcontent und das Drumherum – unentgeltlich, unabhängig, ungezwungen. Artikel, Podcasts und mehr zu Gaming, Organisationskultur und HR-Themen.',
    openGraph: {
        type: 'website',
        locale: OG_LOCALE,
        siteName: OG_SITE_NAME,
        url: absoluteRoute('/'),
        images: [
            {
                url: absoluteRoute('/images/m10z.jpg'),
                alt: 'Mindestens 10 Zeichen',
            },
        ],
    },
    alternates: {
        canonical: absoluteRoute('/'),
    },
};

export default function HomePageWrapper() {
    return (
        <div data-homepage>
            <Suspense fallback={<FeedSkeleton />}>
                <HomePage />
            </Suspense>
        </div>
    );
}