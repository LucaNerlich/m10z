'use cache'

import Link from 'next/link';

import {fetchPodcastsList} from '@/src/lib/strapiContent';

export default async function PodcastsPage() {
    const podcasts = await fetchPodcastsList();

    return (
        <section>
            <h1>Podcasts</h1>
            <ul>
                {podcasts.map((podcast) => {
                    const date = podcast.publishedAt ?? null;
                    return (
                        <li key={podcast.slug}>
                            <Link href={`/podcasts/${podcast.slug}`}>
                                {podcast.base.title}
                            </Link>
                            {date ? (
                                <p>
                                    {new Date(date).toLocaleDateString('de-DE')}
                                </p>
                            ) : null}
                            {podcast.base.description ? (
                                <p>{podcast.base.description}</p>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
