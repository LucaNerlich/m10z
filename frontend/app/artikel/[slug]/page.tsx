'use cache';

import {notFound} from 'next/navigation';

import {Markdown} from '@/src/lib/markdown/Markdown';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {fetchArticleBySlug} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {generateArticleJsonLd} from '@/src/lib/jsonld/article';

type PageProps = {
    params: Promise<{slug: string}>;
};

/**
 * Renders the article detail page for a validated slug, embedding article JSON-LD and the article content.
 *
 * @param params - An object with a `slug` string identifying the article to render
 * @returns A React element containing a JSON-LD script and the main article view (published date, title, optional description, and rendered markdown content)
 */
export default async function ArticleDetailPage({params}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return notFound();

    const article = await fetchArticleBySlug(slug);
    if (!article) return notFound();

    const published = getEffectiveDate(article);
    const jsonLd = generateArticleJsonLd(article);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
            />
            <main>
                <h2>TODO</h2>
                <p>{published ? new Date(published).toLocaleDateString('de-DE') : ''}</p>
                <h1>{article.base.title}</h1>
                {article.base.description ? <p>{article.base.description}</p> : null}
                <Markdown markdown={article.content ?? ''} />
            </main>
        </>
    );
}