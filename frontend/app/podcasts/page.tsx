import {type Metadata} from 'next';

import {sortByDateDesc} from '@/src/lib/effectiveDate';
import {fetchPodcastsList} from '@/src/lib/strapiContent';
import {absoluteRoute} from '@/src/lib/routes';
import {ContentGrid} from '@/src/components/ContentGrid';
import {PodcastCard} from '@/src/components/PodcastCard';

export const metadata: Metadata = {
    title: 'Podcasts',
    description: 'Alle Podcast-Episoden von Mindestens 10 Zeichen. Hören Sie unsere Diskussionen zu Gaming, Organisationskultur und mehr.',
    alternates: {
        canonical: absoluteRoute('/podcasts'),
    },
};

export default async function PodcastsPage() {
    const podcasts = await fetchPodcastsList();
    const sorted = sortByDateDesc(podcasts);

    return (
        <section data-list-page>
            <h1>Podcasts</h1>
            {sorted.length === 0 ? (
                <p>Keine Podcasts gefunden.</p>
            ) : (
                <ContentGrid gap="comfortable">
                    {sorted.map((podcast) => (
                        <PodcastCard
                            key={podcast.slug}
                            podcast={podcast}
                            showAuthors={true}
                            showCategories={true}
                        />
                    ))}
                </ContentGrid>
            )}
        </section>
    );
}
