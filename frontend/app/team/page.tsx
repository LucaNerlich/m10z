'use cache';

import {fetchAuthorsList} from '@/src/lib/strapiContent';
import {ContentGrid} from '@/src/components/ContentGrid';
import {AuthorCard} from '@/src/components/AuthorCard';

/**
 * Renders the Team page by fetching authors and displaying each as a card with avatar, title, description, and content counts.
 *
 * @returns The JSX element for the Team page containing a grid of author cards.
 */
export default async function TeamPage() {
    const authors = await fetchAuthorsList();

    return (
        <section>
            <h1>Team</h1>
            {authors.length === 0 ? (
                <p>Keine Autoren gefunden.</p>
            ) : (
                <ContentGrid gap="comfortable">
                    {authors.map((author) => (
                        <AuthorCard key={author.slug ?? author.id} author={author} />
                    ))}
                </ContentGrid>
            )}
        </section>
    );
}