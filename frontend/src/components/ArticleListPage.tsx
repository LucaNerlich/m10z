'use client';

import {useArticlesList} from '@/src/hooks/useStrapiContent';
import {sortByDateDesc} from '@/src/lib/effectiveDate';
import {ContentGrid} from '@/src/components/ContentGrid';
import {ArticleCard} from '@/src/components/ArticleCard';
import {ArticleListSkeleton} from '@/src/components/ArticleListSkeleton';
import {Card} from '@/src/components/Card';

/**
 * Render the article list page, handling loading, error, empty, and populated states.
 *
 * Displays a loading skeleton while articles are being fetched, an error card with a retry button if the fetch fails, a message when no articles are found, and a sorted grid of ArticleCard components when data is available.
 *
 * @returns A JSX element representing the article list page
 */
export function ArticleListPage() {
    const {data, error, isLoading, isValidating} = useArticlesList(1, 100);

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

    // Defensive client-side sorting
    const sorted = sortByDateDesc(data.items);

    return (
        <section data-list-page>
            <h1>Artikel</h1>
            <ContentGrid gap="comfortable">
                {sorted.map((article) => (
                    <ArticleCard
                        key={article.slug}
                        article={article}
                        showAuthors={true}
                        showCategories={true}
                    />
                ))}
            </ContentGrid>
        </section>
    );
}
