'use cache';

import {notFound} from 'next/navigation';

import {Markdown} from '@/src/lib/markdown/Markdown';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {fetchArticleBySlug} from '@/src/lib/strapiContent';

type PageProps = {
    params: Promise<{slug: string}>;
};

export default async function ArticleDetailPage({params}: PageProps) {
    const {slug} = await params;
    const article = await fetchArticleBySlug(slug);
    if (!article) return notFound();

    const published = getEffectiveDate(article);

    return (
        <main>
            <p>{published ? new Date(published).toLocaleDateString('de-DE') : ''}</p>
            <h1>{article.base.title}</h1>
            {article.base.description ? <p>{article.base.description}</p> : null}
            <Markdown markdown={article.content ?? ''} />
        </main>
    );
}
