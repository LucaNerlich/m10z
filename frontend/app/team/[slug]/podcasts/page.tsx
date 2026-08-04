import {Suspense} from 'react';
import {type Metadata} from 'next';
import {AuthorContentPage, generateAuthorContentMetadata} from '@/src/components/AuthorContentPage';
import {PodcastCard} from '@/src/components/PodcastCard';
import {PodcastListSkeleton} from '@/src/components/PodcastListSkeleton';
import {type StrapiPodcast} from '@/src/lib/strapi/contentTypes';
import {fetchPodcastsByAuthorPaginated} from '@/src/lib/strapiContent';

type PageProps = {
    params: Promise<{slug: string}>;
    searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({params, searchParams}: PageProps): Promise<Metadata> {
    return generateAuthorContentMetadata({params, searchParams, sectionLabel: 'Podcasts', sectionPath: 'podcasts'});
}

export default function AuthorPodcastsPage({params, searchParams}: PageProps) {
    return (
        <Suspense fallback={<PodcastListSkeleton />}>
            <AuthorContentPage<StrapiPodcast>
                params={params}
                searchParams={searchParams}
                sectionLabel="Podcasts"
                sectionPath="podcasts"
                activeSection="podcasts"
                fetchPage={fetchPodcastsByAuthorPaginated}
                renderCard={(podcast) => (
                    <PodcastCard key={podcast.slug} podcast={podcast} showAuthors={false} showCategories={true} />
                )}
                emptyMessageNoFilter="Keine Podcasts von diesem Autor gefunden."
                emptyMessageCategoryFilter="Keine Podcasts in dieser Kategorie von diesem Autor gefunden."
            />
        </Suspense>
    );
}


