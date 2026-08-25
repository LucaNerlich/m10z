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
<<<<<<< HEAD
=======
    const sp = await Promise.resolve(searchParams ?? {});
    const currentPage = parsePageParam(sp);

    let data;
    try {
        data = await fetchPodcastsPage({page: currentPage, pageSize: 12});
    } catch {
        return (
            <section data-list-page>
                <h1>Podcasts</h1>
                <Card variant="empty">
                    <p>Fehler beim Laden der Podcasts.</p>
                    <Link href="/podcasts" style={{marginTop: '1rem', padding: '0.5rem 1rem', display: 'inline-block'}}>
                        Erneut versuchen
                    </Link>
                </Card>
            </section>
        );
    }

    // Out-of-range pages (e.g. /podcasts?page=999) must not be presented as
    // "no podcasts found" — that is misleading when content exists.
    if (data && data.items.length === 0 && data.pagination.total > 0 && currentPage > data.pagination.pageCount) {
        return (
            <section data-list-page>
                <h1>Podcasts</h1>
                <Card variant="empty">
                    <p>Diese Seite existiert nicht.</p>
                    <Link href="/podcasts" style={{marginTop: '1rem', padding: '0.5rem 1rem', display: 'inline-block'}}>
                        Zur ersten Seite
                    </Link>
                </Card>
            </section>
        );
    }

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

>>>>>>> cleanup/8-slop
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
