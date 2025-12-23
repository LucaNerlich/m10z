'use cache';

import {type Metadata} from 'next';
import Link from 'next/link';

import {getEffectiveDate, toDateTimestamp} from '@/src/lib/effectiveDate';
import {fetchArticlesList} from '@/src/lib/strapiContent';
import {absoluteRoute} from '@/src/lib/routes';

export const metadata: Metadata = {
    title: 'Artikel',
    description: 'Alle Artikel von Mindestens 10 Zeichen. Lesen Sie unsere Beiträge zu Gaming, Organisationskultur, HR-Themen und mehr.',
    alternates: {
        canonical: absoluteRoute('/artikel'),
    },
};

export default async function ArticlePage() {
    const articles = await fetchArticlesList();
    const sorted = [...articles].sort((a, b) => {
        const ad = toDateTimestamp(getEffectiveDate(a)) ?? 0;
        const bd = toDateTimestamp(getEffectiveDate(b)) ?? 0;
        return bd - ad;
    });

    return (
        <section>
            <h1>Artikel</h1>
            <h2>TODO</h2>
            <ul>
                {sorted.map((article) => {
                    const date = getEffectiveDate(article);
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
