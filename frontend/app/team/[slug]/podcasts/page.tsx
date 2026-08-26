import {type Metadata} from 'next';
import {AuthorContentPage, generateAuthorContentMetadata} from '@/src/components/AuthorContentPage';
import {PodcastCard} from '@/src/components/PodcastCard';
import {type StrapiPodcast} from '@/src/lib/strapi/contentTypes';
import {type PageSearchParams, type SlugPageParams} from '@/src/lib/params';
import {fetchPodcastsByAuthorPaginated} from '@/src/lib/strapiContent';

type PageProps = SlugPageParams & {
    searchParams?: Promise<PageSearchParams>;
};

export async function generateMetadata({params, searchParams}: PageProps): Promise<Metadata> {
    return generateAuthorContentMetadata({params, searchParams, sectionLabel: 'Podcasts', sectionPath: 'podcasts'});
}

export default async function AuthorPodcastsPage({params, searchParams}: PageProps) {
    return (
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
    );
}


