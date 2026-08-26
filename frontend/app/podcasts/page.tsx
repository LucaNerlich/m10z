import {type Metadata} from 'next';
import {Suspense} from 'react';

import {ContentListSkeleton} from '@/src/components/ContentListSkeleton';
import {PodcastListPage} from '@/src/components/PodcastListPage';
import {type PageSearchParams} from '@/src/lib/params';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';

export const metadata: Metadata = buildStaticListMetadata({
    title: 'Podcasts',
    description:
        'Alle Podcast-Episoden von Mindestens 10 Zeichen. Hören Sie unsere Diskussionen zu Gaming, Organisationskultur und mehr.',
    path: '/podcasts',
    ogImageAlt: 'Podcasts von Mindestens 10 Zeichen',
});

/**
 * Render the podcasts listing page.
 *
 * Wraps the PodcastListPage component in a Suspense boundary and provides a skeleton fallback.
 *
 * @returns The JSX element that renders the podcast list.
 */
export default function PodcastsPage({
                                         searchParams,
                                     }: {
    searchParams?: Promise<PageSearchParams>;
}) {
    return (
        <Suspense fallback={<ContentListSkeleton title="Podcasts" />}>
            <PodcastListPage searchParams={searchParams} />
        </Suspense>
    );
}
