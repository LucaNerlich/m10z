import {PodcastCard} from './PodcastCard';
import {ContentListPage} from './ContentListPage';

import {fetchPodcastsPage} from '@/src/lib/strapiContent';

/**
 * Render a podcasts listing page with loading, error, empty, and populated states.
 *
 * @returns The page's JSX: either a loading skeleton, an error panel with retry, an empty-state message, or a grid of podcast cards.
 */
export async function PodcastListPage({
                                          searchParams,
                                      }: {
    searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
    return (
        <ContentListPage
            title="Podcasts"
            basePath="/podcasts"
            searchParams={searchParams}
            fetchPage={fetchPodcastsPage}
            renderCard={(podcast) => (
                <PodcastCard key={podcast.slug} podcast={podcast} showAuthors={true} showCategories={true} />
            )}
        />
    );
}
