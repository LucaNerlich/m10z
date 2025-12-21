import Link from 'next/link';

import {fetchArticlesList} from '@/src/lib/strapiContent';

export default async function ArticlePage() {
    const articles = await fetchArticlesList();

    return (
        <section>
            <h1>Artikel</h1>
            <ul>
                {articles.map((article) => {
                    const date = article.publishDate ?? article.publishedAt ?? null;
                    return (
                        <li key={article.slug}>
                            <Link href={`/artikel/${article.slug}`}>
                                {article.base.title}
                            </Link>
                            {date ? (
                                <p>
                                    {new Date(date).toLocaleDateString('de-DE')}
                                </p>
                            ) : null}
                            {article.base.description ? (
                                <p>{article.base.description}</p>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
