import {type Metadata} from 'next';

import {ArticleCard} from '@/src/components/ArticleCard';
import {AuthorContentPage, generateAuthorContentMetadata} from '@/src/components/AuthorContentPage';
import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {fetchArticlesByAuthorPaginated} from '@/src/lib/strapiContent';

type PageProps = {
    params: Promise<{slug: string}>;
    searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({params, searchParams}: PageProps): Promise<Metadata> {
    return generateAuthorContentMetadata({params, searchParams, sectionLabel: 'Artikel', sectionPath: 'artikel'});
}

export default async function AuthorArticlesPage({params, searchParams}: PageProps) {
    return (
        <AuthorContentPage<StrapiArticle>
            params={params}
            searchParams={searchParams}
            sectionLabel="Artikel"
            sectionPath="artikel"
            activeSection="artikel"
            fetchPage={fetchArticlesByAuthorPaginated}
            renderCard={(article) => (
                <ArticleCard key={article.slug} article={article} showAuthors={false} showCategories={true} />
            )}
            emptyMessageNoFilter="Keine Artikel von dieser*m Autor*in gefunden."
            emptyMessageCategoryFilter="Keine Artikel in dieser Kategorie von diesem Autor gefunden."
        />
    );
}


