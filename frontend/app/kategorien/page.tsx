import Link from 'next/link';

import {fetchCategoriesWithContent} from '@/src/lib/strapiContent';

export default async function CategoriesPage() {
    const categories = await fetchCategoriesWithContent();

    return (
        <section>
            <h1>Kategorien</h1>
            <ul>
                {categories.map((cat) => (
                    <li key={cat.slug ?? cat.id}>
                        <h2>{cat.base?.title ?? cat.slug}</h2>
                        {cat.base?.description ? <p>{cat.base.description}</p> : null}

                        {cat.articles && cat.articles.length > 0 ? (
                            <div>
                                <h3>Artikel</h3>
                                <ul>
                                    {cat.articles.map((a) => (
                                        <li key={a.slug}>
                                            <Link href={`/artikel/${a.slug}`}>{a.base.title}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}

                        {cat.podcasts && cat.podcasts.length > 0 ? (
                            <div>
                                <h3>Podcasts</h3>
                                <ul>
                                    {cat.podcasts.map((p) => (
                                        <li key={p.slug}>
                                            <Link href={`/podcasts/${p.slug}`}>{p.base.title}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </li>
                ))}
            </ul>
        </section>
    );
}
