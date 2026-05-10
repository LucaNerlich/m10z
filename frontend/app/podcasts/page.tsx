import {type Metadata} from 'next';
import {Suspense} from 'react';

import {PodcastListPage} from '@/src/components/PodcastListPage';
import {PodcastListSkeleton} from '@/src/components/PodcastListSkeleton';
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
    searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
    return (
        <Suspense fallback={<PodcastListSkeleton />}>
            <PodcastListPage searchParams={searchParams} />
        </Suspense>
    );
}
