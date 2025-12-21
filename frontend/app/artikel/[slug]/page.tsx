import {notFound} from 'next/navigation';

import {Markdown} from '@/src/lib/markdown/Markdown';
import {fetchArticleBySlug} from '@/src/lib/strapiContent';

type PageProps = {
    params: Promise<{slug: string}>;
};

export default async function ArticleDetailPage({params}: PageProps) {
    const {slug} = await params;
    const article = await fetchArticleBySlug(slug);
    if (!article) return notFound();

    const published = article.publishDate ?? article.publishedAt ?? null;

    return (
        <main style={{padding: '24px 20px', maxWidth: 960, margin: '0 auto'}}>
            <p style={{color: 'var(--color-text-muted)', marginBottom: 6}}>
                {published ? new Date(published).toLocaleDateString('de-DE') : ''}
            </p>
            <h1 style={{margin: '0 0 12px'}}>{article.base.title}</h1>
            {article.base.description ? (
                <p style={{marginBottom: 16, color: 'var(--color-text-muted)'}}>{article.base.description}</p>
            ) : null}
            <Markdown markdown={article.content ?? ''} />
        </main>
    );
}
