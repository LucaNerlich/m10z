'use client';

import {useSearchParams} from 'next/navigation';
import {useArticlesList} from '@/src/hooks/useStrapiContent';
import {ContentGrid} from '@/src/components/ContentGrid';
import {ArticleCard} from '@/src/components/ArticleCard';
import {ArticleListSkeleton} from '@/src/components/ArticleListSkeleton';
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
 * Render the article list page, handling loading, error, empty, and populated states.
 *
 * Displays a loading skeleton while articles are being fetched, an error card with a retry button if the fetch fails, a message when no articles are found, and a paginated grid of ArticleCard components when data is available.
 *
 * @returns A JSX element representing the article list page
 */
export function ArticleListPage() {
    const searchParams = useSearchParams();
    const currentPage = parsePageParam(searchParams);
    const {data, error, isLoading, isValidating} = useArticlesList(currentPage, 12);

    // Show loading skeleton
    if (isLoading && !data) {
        return <ArticleListSkeleton />;
    }

    // Handle errors
    if (error) {
        return (
            <section data-list-page>
                <h1>Artikel</h1>
                <Card variant="empty">
                    <p>Fehler beim Laden der Artikel.</p>
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
                <h1>Artikel</h1>
                <p>Keine Artikel gefunden.</p>
            </section>
        );
    }

    const {page, pageCount} = data.pagination;
    const prevPage = page > 1 ? page - 1 : null;
    const nextPage = page < pageCount ? page + 1 : null;

    return (
        <section data-list-page>
            <h1>Artikel</h1>
            <ContentGrid gap="comfortable">
                {data.items.map((article) => (
                    <ArticleCard
                        key={article.slug}
                        article={article}
                        showAuthors={true}
                        showCategories={true}
                    />
                ))}
            </ContentGrid>
            {data.items.length > 0 && pageCount > 1 && (
                <Pagination
                    currentPage={page}
                    totalPages={pageCount}
                    previousHref={prevPage ? `/artikel?page=${prevPage}` : undefined}
                    nextHref={nextPage ? `/artikel?page=${nextPage}` : undefined}
                />
            )}
        </section>
    );
}

