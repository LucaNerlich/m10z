'use client';

import {useSearchParams} from 'next/navigation';
import {usePodcastsList} from '@/src/hooks/useStrapiContent';
import {ContentGrid} from '@/src/components/ContentGrid';
import {PodcastCard} from '@/src/components/PodcastCard';
import {PodcastListSkeleton} from '@/src/components/PodcastListSkeleton';
import {Card} from '@/src/components/Card';
import {Pagination} from '@/src/components/Pagination';

/**
 * Parse the page parameter from URL search parameters, validated as a positive integer.
 *
 * @param searchParams - URL search parameters potentially containing a `page` entry
 * @returns The page number as an integer (minimum 1); returns 1 for missing or invalid values
 */
function parsePageParam(searchParams: URLSearchParams): number {
    const raw = searchParams.get('page');
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.max(1, Math.floor(parsed));
}

/**
 * Render a podcasts listing page with loading, error, empty, and populated states.
 *
 * Fetches paginated podcasts and displays a loading skeleton while loading, an error panel
 * with a retry button when fetching fails, a message when no podcasts are available, or a
 * paginated grid of PodcastCard items when data is present.
 *
 * @returns The page's JSX: either a loading skeleton, an error panel with retry, an empty-state message, or a grid of podcast cards.
 */
export function PodcastListPage() {
    const searchParams = useSearchParams();
    const currentPage = parsePageParam(searchParams);
    const {data, error, isLoading, isValidating} = usePodcastsList(currentPage, 12);

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
                        type="button"
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

    const {page, pageCount} = data.pagination;
    const prevPage = page > 1 ? page - 1 : null;
    const nextPage = page < pageCount ? page + 1 : null;

    return (
        <section data-list-page>
            <h1>Podcasts</h1>
            <ContentGrid gap="comfortable">
                {data.items.map((podcast) => (
                    <PodcastCard
                        key={podcast.slug}
                        podcast={podcast}
                        showAuthors={true}
                        showCategories={true}
                    />
                ))}
            </ContentGrid>
            {data.items.length > 0 && pageCount > 1 && (
                <Pagination
                    currentPage={page}
                    totalPages={pageCount}
                    previousHref={prevPage ? `/podcasts?page=${prevPage}` : undefined}
                    nextHref={nextPage ? `/podcasts?page=${nextPage}` : undefined}
                />
            )}
        </section>
    );
}
