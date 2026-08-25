import {ArticleCard} from './ArticleCard';
import {ContentListPage} from './ContentListPage';

import {fetchArticlesPage} from '@/src/lib/strapiContent';

/**
 * Render the article list page, handling loading, error, empty, and populated states.
 *
 * @returns A JSX element representing the article list page
 */
export async function ArticleListPage({
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
        data = await fetchArticlesPage({page: currentPage, pageSize: 12});
    } catch {
        return (
            <section data-list-page>
                <h1>Artikel</h1>
                <Card variant="empty">
                    <p>Fehler beim Laden der Artikel.</p>
                    <Link href="/artikel" style={{marginTop: '1rem', padding: '0.5rem 1rem', display: 'inline-block'}}>
                        Erneut versuchen
                    </Link>
                </Card>
            </section>
        );
    }

    // Out-of-range pages (e.g. /artikel?page=999) must not be presented as
    // "no articles found" — that is misleading when content exists.
    if (data && data.items.length === 0 && data.pagination.total > 0 && currentPage > data.pagination.pageCount) {
        return (
            <section data-list-page>
                <h1>Artikel</h1>
                <Card variant="empty">
                    <p>Diese Seite existiert nicht.</p>
                    <Link href="/artikel" style={{marginTop: '1rem', padding: '0.5rem 1rem', display: 'inline-block'}}>
                        Zur ersten Seite
                    </Link>
                </Card>
            </section>
        );
    }

    if (!data || data.items.length === 0) {
        return (
            <section data-list-page>
                <h1>Artikel</h1>
                <p>Keine Artikel gefunden.</p>
            </section>
        );
    }

    const {page, pageCount} = data.pagination;
    const prevPage = page > 1 ? page - 1 : null;
    const nextPage = page < pageCount ? page + 1 : null;

>>>>>>> cleanup/8-slop
    return (
        <ContentListPage
            title="Artikel"
            basePath="/artikel"
            searchParams={searchParams}
            fetchPage={fetchArticlesPage}
            renderCard={(article) => (
                <ArticleCard key={article.slug} article={article} showAuthors={true} showCategories={true} />
            )}
        />
    );
}
