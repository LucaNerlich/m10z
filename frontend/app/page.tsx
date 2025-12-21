import Link from 'next/link';
import {Suspense} from 'react';

import {fetchArticlesList, fetchPodcastsList} from '@/src/lib/strapiContent';

export default function HomePage() {
    return (
        <div>
            <h1>m10z</h1>

            <Suspense fallback={<p>Lade Artikel…</p>}>
                <LatestArticles />
            </Suspense>

            <Suspense fallback={<p>Lade Podcasts…</p>}>
                <LatestPodcasts />
            </Suspense>
        </div>
    );
}

async function LatestArticles() {
    'use cache';
    const articles = await fetchArticlesList({limit: 10, tags: ['page:home', 'strapi:article']});
    const filtered = articles.filter((a) => Boolean(a.publishDate ?? a.publishedAt));

    return (
        <section>
            <h2>Neueste Artikel</h2>
            <ul>
                {filtered.map((a) => (
                    <li key={a.slug}>
                        <Link href={`/artikel/${a.slug}`}>{a.base.title}</Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}

async function LatestPodcasts() {
    'use cache';
    const podcasts = await fetchPodcastsList({limit: 10, tags: ['page:home', 'strapi:podcast']});
    const filtered = podcasts.filter((p) => Boolean(p.publishDate ?? p.publishedAt));

    return (
        <section>
            <h2>Neueste Podcasts</h2>
            <ul>
                {filtered.map((p) => (
                    <li key={p.slug}>
                        <Link href={`/podcasts/${p.slug}`}>{p.base.title}</Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
