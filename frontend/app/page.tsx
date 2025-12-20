import Link from 'next/link';
import { Suspense } from 'react';

import { fetchStrapiCollection } from '@/src/lib/strapi';

const REVALIDATE_SECONDS = 3600;

type ArticleListItem = {
  id: number;
  slug: string;
  publishedAt: string | null;
  base: { title: string };
};

type PodcastListItem = {
  id: number;
  slug: string;
  publishedAt: string | null;
  base: { title: string };
};

export default async function HomePage() {
  return (
    <main>
      <h1>m10z</h1>
      <Suspense fallback={<p>Lade Inhalte…</p>}>
        <HomeContent />
      </Suspense>
    </main>
  );
}

async function HomeContent() {
  const [articlesRes, podcastsRes] = await Promise.all([
    fetchStrapiCollection<ArticleListItem>(
      'articles',
      'sort=publishedAt:desc&pagination[pageSize]=10&populate=*',
      { revalidateSeconds: REVALIDATE_SECONDS, tags: ['page:home', 'strapi:article'] }
    ),
    fetchStrapiCollection<PodcastListItem>(
      'podcasts',
      'sort=publishedAt:desc&pagination[pageSize]=10&populate=*',
      { revalidateSeconds: REVALIDATE_SECONDS, tags: ['page:home', 'strapi:podcast'] }
    ),
  ]);

  const articles = articlesRes.data.filter((a) => Boolean(a.publishedAt));
  const podcasts = podcastsRes.data.filter((p) => Boolean(p.publishedAt));

  return (
    <>
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
    </>
  );
}
