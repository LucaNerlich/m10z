'use cache';

import Link from 'next/link';

import {getEffectiveDate, toDateTimestamp} from '@/src/lib/effectiveDate';
import {fetchPodcastsList} from '@/src/lib/strapiContent';

export default async function PodcastsPage() {
    const podcasts = await fetchPodcastsList();
    const sorted = [...podcasts].sort((a, b) => {
        const ad = toDateTimestamp(getEffectiveDate(a)) ?? 0;
        const bd = toDateTimestamp(getEffectiveDate(b)) ?? 0;
        return bd - ad;
    });

    return (
        <section>
            <h1>Podcasts</h1>
            <ul>
                {sorted.map((podcast) => {
                    const date = getEffectiveDate(podcast);
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
