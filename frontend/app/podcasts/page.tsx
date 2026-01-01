import {type Metadata} from 'next';
import {Suspense} from 'react';

import {PodcastListPage} from '@/src/components/PodcastListPage';
import {PodcastListSkeleton} from '@/src/components/PodcastListSkeleton';
import {absoluteRoute} from '@/src/lib/routes';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';

export const metadata: Metadata = {
    title: 'Podcasts',
    description: 'Alle Podcast-Episoden von Mindestens 10 Zeichen. Hören Sie unsere Diskussionen zu Gaming, Organisationskultur und mehr.',
    openGraph: {
        type: 'website',
        locale: OG_LOCALE,
        siteName: OG_SITE_NAME,
        url: absoluteRoute('/podcasts'),
        images: [
            {
                url: absoluteRoute('/images/m10z.jpg'),
                width: 1200,
                height: 630,
            },
        ],
    },
    alternates: {
        canonical: absoluteRoute('/podcasts'),
    },
};

/**
 * Render the podcasts listing page.
 *
 * Wraps the PodcastListPage component in a Suspense boundary and provides a skeleton fallback.
 *
 * @returns The JSX element that renders the podcast list.
 */
export default function PodcastsPage() {
    return (
        <Suspense fallback={<PodcastListSkeleton />}>
            <PodcastListPage />
        </Suspense>
    );
}