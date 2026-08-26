import {type Metadata} from 'next';

import {ArticleCard} from '@/src/components/ArticleCard';
import {AuthorContentPage, generateAuthorContentMetadata} from '@/src/components/AuthorContentPage';
import {type StrapiArticle} from '@/src/lib/strapi/contentTypes';
import {type PageSearchParams, type SlugPageParams} from '@/src/lib/params';
import {fetchArticlesByAuthorPaginated} from '@/src/lib/strapiContent';

type PageProps = SlugPageParams & {
    searchParams?: Promise<PageSearchParams>;
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


