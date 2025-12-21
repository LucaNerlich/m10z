import Link from 'next/link';
import {Suspense} from 'react';

import {fetchStrapiCollection} from '@/src/lib/strapi';

const REVALIDATE_SECONDS = 3600;

type ArticleListItem = {
    id: number;
    slug: string;
    publishedAt: string | null;
    base: {title: string};
};

type PodcastListItem = {
    id: number;
    slug: string;
    publishedAt: string | null;
    base: {title: string};
};

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
    const res = await fetchStrapiCollection<ArticleListItem>(
        'articles',
        'sort=publishedAt:desc&pagination[pageSize]=10&populate=*',
        {revalidateSeconds: REVALIDATE_SECONDS, tags: ['page:home', 'strapi:article']},
    );

    const articles = res.data.filter((a) => Boolean(a.publishedAt));

    return (
        <section>
            <h2>Neueste Artikel</h2>
            <ul>
                {articles.map((a) => (
                    <li key={a.id}>
                        <Link href={`/artikel/${a.slug}`}>{a.base.title}</Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}

async function LatestPodcasts() {
    'use cache';
    const res = await fetchStrapiCollection<PodcastListItem>(
        'podcasts',
        'sort=publishedAt:desc&pagination[pageSize]=10&populate=*',
        {revalidateSeconds: REVALIDATE_SECONDS, tags: ['page:home', 'strapi:podcast']},
    );

    const podcasts = res.data.filter((p) => Boolean(p.publishedAt));

    return (
        <section>
            <h2>Neueste Podcasts</h2>
            <ul>
                {podcasts.map((p) => (
                    <li key={p.id}>
                        <Link href={`/podcasts/${p.slug}`}>{p.base.title}</Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
