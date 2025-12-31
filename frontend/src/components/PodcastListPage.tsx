'use client';

import {usePodcastsList} from '@/src/hooks/useStrapiContent';
import {sortByDateDesc} from '@/src/lib/effectiveDate';
import {ContentGrid} from '@/src/components/ContentGrid';
import {PodcastCard} from '@/src/components/PodcastCard';
import {PodcastListSkeleton} from '@/src/components/PodcastListSkeleton';
import {Card} from '@/src/components/Card';

/**
 * Client component for the podcast list page.
 * Fetches podcasts using SWR and displays them in a grid layout.
 */
export function PodcastListPage() {
    const {data, error, isLoading, isValidating} = usePodcastsList(1, 100);

    // Show loading skeleton
    if (isLoading && !data) {
        return <PodcastListSkeleton />;
    }

    // Handle errors
    if (error) {
        return (
            <section data-list-page>
                <h1>Podcasts</h1>
                <Card variant="empty">
                    <p>Fehler beim Laden der Podcasts.</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{marginTop: '1rem', padding: '0.5rem 1rem'}}
                    >
                        Erneut versuchen
                    </button>
                </Card>
            </section>
        );
    }

    // Handle empty state
    if (!data || data.items.length === 0) {
        return (
            <section data-list-page>
                <h1>Podcasts</h1>
                <p>Keine Podcasts gefunden.</p>
            </section>
        );
    }

    // Defensive client-side sorting
    const sorted = sortByDateDesc(data.items);

    return (
        <section data-list-page>
            <h1>Podcasts</h1>
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
        </section>
    );
}

