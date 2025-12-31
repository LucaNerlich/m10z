import {type Metadata} from 'next';
import {fetchAuthorsList} from '@/src/lib/strapiContent';
import {absoluteRoute} from '@/src/lib/routes';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';
import {ContentGrid} from '@/src/components/ContentGrid';
import {AuthorCard} from '@/src/components/AuthorCard';

export const metadata: Metadata = {
    title: 'Team',
    description: 'Lernen Sie das Team von Mindestens 10 Zeichen kennen. Unsere Autoren und Podcaster.',
    openGraph: {
        type: 'website',
        locale: OG_LOCALE,
        siteName: OG_SITE_NAME,
        url: absoluteRoute('/team'),
        images: [
            {
                url: absoluteRoute('/images/m10z.jpg'),
                width: 1200,
                height: 630,
            },
        ],
    },
    alternates: {
        canonical: absoluteRoute('/team'),
    },
};

/**
 * Renders the Team page by fetching authors and displaying each as a card with avatar, title, description, and content counts.
 *
 * @returns The JSX element for the Team page containing a grid of author cards.
 */
export default async function TeamPage() {
    const authors = await fetchAuthorsList();

    return (
        <section data-list-page>
            <h1>Team</h1>
            {authors.length === 0 ? (
                <p>Keine Autoren gefunden.</p>
            ) : (
                <ContentGrid gap="comfortable">
                    {authors.map((author) => {
                        const articleCount = author.articles?.filter((a) => a.publishedAt).length ?? 0;
                        const podcastCount = author.podcasts?.filter((p) => p.publishedAt).length ?? 0;
                        return (
                            <AuthorCard
                                key={author.slug ?? author.id}
                                author={author}
                                articleCount={articleCount}
                                podcastCount={podcastCount}
                            />
                        );
                    })}
                </ContentGrid>
            )}
        </section>
    );
}
