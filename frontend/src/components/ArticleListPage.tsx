import {ArticleCard} from './ArticleCard';
import {ContentListPage} from './ContentListPage';

import {type PageSearchParamsInput} from '@/src/lib/params';
import {fetchArticlesPage} from '@/src/lib/strapiContent';

/**
 * Render the article list page, handling loading, error, empty, and populated states.
 *
 * @returns A JSX element representing the article list page
 */
export async function ArticleListPage({
                                          searchParams,
                                      }: {
    searchParams?: PageSearchParamsInput;
}) {
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
